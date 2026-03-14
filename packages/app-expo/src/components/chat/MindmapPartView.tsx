import { fontSize as fs, fontWeight as fw, radius, useColors } from "@/styles/theme";
import type { MindmapPart } from "@readany/core/types/message";
import { ScrollView, Text, View } from "react-native";

interface MindmapPartViewProps {
  part: MindmapPart;
}

export function MindmapPartView({ part }: MindmapPartViewProps) {
  const colors = useColors();

  const renderMarkdownTree = (markdown: string) => {
    const lines = markdown.split("\n").filter((line) => line.trim());
    const nodes: Array<{
      level: number;
      text: string;
      isBullet: boolean;
    }> = [];

    lines.forEach((line) => {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
      const bulletMatch = line.match(/^(\s*)-\s+(.+)/);

      if (headingMatch) {
        nodes.push({
          level: headingMatch[1].length,
          text: headingMatch[2].trim(),
          isBullet: false,
        });
      } else if (bulletMatch) {
        const indent = bulletMatch[1].length;
        const level = Math.floor(indent / 2) + 7; // Convert bullets to level 7+
        nodes.push({
          level,
          text: bulletMatch[2].trim(),
          isBullet: true,
        });
      }
    });

    return nodes.map((node, index) => {
      const indent = node.isBullet ? (node.level - 7) * 16 + 24 : (node.level - 1) * 16;
      const fontSize = node.isBullet ? fs.xs : Math.max(fs.base - (node.level - 1) * 2, fs.xs);
      const fontWeight: "normal" | "bold" = node.isBullet ? "normal" : node.level <= 2 ? "bold" : "normal";

      return (
        <View
          key={index}
          style={{
            flexDirection: "row",
            paddingLeft: indent,
            paddingVertical: 2,
          }}
        >
          <Text
            style={{
              fontSize: fs.xs,
              color: colors.mutedForeground,
              marginRight: 6,
            }}
          >
            {node.isBullet ? "•" : "▸"}
          </Text>
          <Text
            style={{
              fontSize,
              fontWeight,
              color: node.level === 1 ? colors.primary : colors.foreground,
              flex: 1,
            }}
          >
            {node.text}
          </Text>
        </View>
      );
    });
  };

  return (
    <View
      style={{
        marginVertical: 8,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.muted,
        }}
      >
        <Text
          style={{
            fontSize: fs.sm,
            fontWeight: fw.semibold,
            color: colors.foreground,
          }}
        >
          {part.title}
        </Text>
      </View>
      <ScrollView
        style={{
          maxHeight: 400,
          paddingVertical: 8,
        }}
        nestedScrollEnabled
      >
        {renderMarkdownTree(part.markdown)}
      </ScrollView>
    </View>
  );
}
