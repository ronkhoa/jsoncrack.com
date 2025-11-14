import React, { useState, useEffect } from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, Text, ScrollArea, Flex, CloseButton, Button, Group, Textarea } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import { toast } from "react-hot-toast";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useJson from "../../../store/useJson";

// return object from json removing array and object fields
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

// Helper function to update a value at a specific path in JSON
const updateValueAtPath = (json: any, path: (string | number)[], newValue: any): any => {
  if (!path || path.length === 0) return newValue;

  const copy = Array.isArray(json) ? [...json] : { ...json };
  let current = copy;

  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!(key in current)) {
      current[key] = typeof path[i + 1] === "number" ? [] : {};
    }
    current = current[key];
  }

  const lastKey = path[path.length - 1];
  current[lastKey] = newValue;

  return copy;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const json = useJson(state => state.json);
  const setJson = useJson(state => state.setJson);

  useEffect(() => {
    if (nodeData?.text) {
      // For single values, just stringify the value
      if (nodeData.text.length === 1 && !nodeData.text[0].key) {
        setEditValue(JSON.stringify(nodeData.text[0].value));
      } else {
        // For objects/arrays with multiple properties, show all attributes
        const obj = {};
        nodeData.text.forEach(row => {
          if (row.type !== "array" && row.type !== "object" && row.key) {
            obj[row.key] = row.value;
          }
        });
        setEditValue(JSON.stringify(obj, null, 2));
      }
    }
  }, [nodeData]);

  const handleSave = () => {
    try {
      const parsedValue = JSON.parse(editValue);
      const jsonObj = JSON.parse(json);

      // If the original node has a key, update it as a property
      if (nodeData?.text[0]?.key) {
        // Merge the edited properties back
        const path = nodeData.path || [];
        const targetObj = path.length === 0 ? jsonObj : path.reduce((obj, key) => obj[key], jsonObj);
        
        if (typeof parsedValue === "object" && !Array.isArray(parsedValue)) {
          // Update each property in the object
          Object.keys(parsedValue).forEach(key => {
            targetObj[key] = parsedValue[key];
          });
        } else {
          // Single value update
          const updatedJson = updateValueAtPath(jsonObj, nodeData.path || [], parsedValue);
          setJson(JSON.stringify(updatedJson, null, 2));
          setIsEditing(false);
          toast.success("Value updated successfully");
          return;
        }
      } else {
        // Root level value update
        const updatedJson = updateValueAtPath(jsonObj, nodeData?.path || [], parsedValue);
        setJson(JSON.stringify(updatedJson, null, 2));
        setIsEditing(false);
        toast.success("Value updated successfully");
        return;
      }

      setJson(JSON.stringify(jsonObj, null, 2));
      setIsEditing(false);
      toast.success("Value updated successfully");
    } catch (error) {
      toast.error("Invalid JSON value");
    }
  };

  const handleCancel = () => {
    if (nodeData?.text) {
      if (nodeData.text.length === 1 && !nodeData.text[0].key) {
        setEditValue(JSON.stringify(nodeData.text[0].value));
      } else {
        const obj = {};
        nodeData.text.forEach(row => {
          if (row.type !== "array" && row.type !== "object" && row.key) {
            obj[row.key] = row.value;
          }
        });
        setEditValue(JSON.stringify(obj, null, 2));
      }
    }
    setIsEditing(false);
  };

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              {isEditing ? "Edit" : "Content"}
            </Text>
            <CloseButton onClick={onClose} />
          </Flex>
          <ScrollArea.Autosize mah={250} maw={600}>
            {isEditing ? (
              <Textarea
                value={editValue}
                onChange={e => setEditValue(e.currentTarget.value)}
                placeholder="Enter new value (must be valid JSON)"
                minRows={4}
                style={{ fontFamily: "monospace", fontSize: "12px" }}
              />
            ) : (
              <CodeHighlight
                code={normalizeNodeData(nodeData?.text ?? [])}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            )}
          </ScrollArea.Autosize>
        </Stack>

        {isEditing && (
          <Group justify="flex-end" gap="xs">
            <Button variant="default" size="xs" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="xs" onClick={handleSave} color="blue">
              Save
            </Button>
          </Group>
        )}

        {!isEditing && (
          <Button size="xs" onClick={() => setIsEditing(true)} variant="light" color="blue">
            Edit
          </Button>
        )}

        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
