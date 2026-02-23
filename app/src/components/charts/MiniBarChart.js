import React from "react";
import { View, Text, StyleSheet } from "react-native";

/**
 * MiniBarChart
 *
 * A lightweight bar chart built entirely with React Native Views.
 * No SVG, no chart library, no native modules — works on iOS, Android, and Web.
 *
 * Props:
 *   data        {Array<{ label, shortLabel, value }>}  - chart data
 *   color       {string}                               - bar fill color
 *   height      {number}                               - chart area height (default 120)
 *   formatValue {function}                             - tooltip/label formatter
 *   unit        {string}                               - unit label on y-axis
 */
export default function MiniBarChart({
  data = [],
  color = "#1565c0",
  height = 120,
  formatValue = (v) => String(v),
  unit = "",
}) {
  if (!data.length) return null;

  const values  = data.map((d) => d.value ?? 0);
  const maxVal  = Math.max(...values, 1);
  const barCount = data.length;

  // Show every nth label to avoid crowding
  const labelStep = barCount > 10 ? Math.ceil(barCount / 7) : 1;

  return (
    <View style={styles.container}>
      {/* Bars */}
      <View style={[styles.chartArea, { height }]}>
        {data.map((item, i) => {
          const ratio      = (item.value ?? 0) / maxVal;
          const barHeight  = Math.max(ratio * height, item.value > 0 ? 3 : 0);
          const isToday    = i === data.length - 1;

          return (
            <View key={i} style={styles.barWrapper}>
              <View style={[styles.barBackground, { height }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      height:          barHeight,
                      backgroundColor: isToday
                        ? color
                        : color + "99", // slightly transparent for non-today
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      {/* X-axis labels */}
      <View style={styles.labels}>
        {data.map((item, i) => (
          <View key={i} style={styles.labelWrapper}>
            {i % labelStep === 0 || i === data.length - 1 ? (
              <Text style={styles.labelText} numberOfLines={1}>
                {item.shortLabel ?? item.label ?? ""}
              </Text>
            ) : null}
          </View>
        ))}
      </View>

      {/* Max value hint */}
      {maxVal > 0 ? (
        <Text style={styles.maxHint}>
          Max: {formatValue(maxVal)}{unit}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", paddingTop: 4 },
  chartArea: {
    flexDirection: "row",
    alignItems:    "flex-end",
    gap:           2,
    paddingBottom: 4,
  },
  barWrapper: {
    flex:           1,
    alignItems:     "center",
  },
  barBackground: {
    width:          "100%",
    justifyContent: "flex-end",
  },
  bar: {
    width:        "100%",
    borderRadius: 3,
    minHeight:    0,
  },
  labels: {
    flexDirection:  "row",
    marginTop:      4,
  },
  labelWrapper: {
    flex:       1,
    alignItems: "center",
  },
  labelText: {
    fontSize: 9,
    color:    "#bbb",
    textAlign:"center",
  },
  maxHint: {
    fontSize:  10,
    color:     "#ccc",
    textAlign: "right",
    marginTop: 2,
  },
});
