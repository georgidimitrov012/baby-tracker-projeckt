import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";

/**
 * Reusable labeled numeric input with inline error display.
 */
export default function FormInput({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  unit,
  ...rest
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#bbb"
          keyboardType="numeric"
          returnKeyType="done"
          {...rest}
        />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#111",
  },
  inputError: {
    borderColor: "#e53935",
  },
  unit: {
    marginLeft: 10,
    fontSize: 14,
    color: "#888",
    width: 32,
  },
  errorText: {
    marginTop: 5,
    fontSize: 12,
    color: "#e53935",
  },
});
