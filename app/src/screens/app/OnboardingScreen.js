import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";

const STEPS = [
  {
    emoji: "👶",
    title: "Welcome to Baby Tracker!",
    body: "You're all set up. Let's take a quick look at what you can do.",
    bullets: null,
  },
  {
    emoji: "📊",
    title: "Track Everything",
    body: null,
    bullets: [
      "🍼  Feedings & amounts",
      "😴  Sleep sessions",
      "💩  Quick logs",
      "📏  Growth & milestones",
    ],
  },
  {
    emoji: "👨‍👩‍👧",
    title: "Share with Family",
    body: "Invite co-parents and caregivers to track together with different access levels.",
    bullets: null,
  },
];

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.emoji}>{current.emoji}</Text>
          <Text style={styles.title}>{current.title}</Text>

          {current.body ? (
            <Text style={styles.body}>{current.body}</Text>
          ) : null}

          {current.bullets ? (
            <View style={styles.bullets}>
              {current.bullets.map((b, i) => (
                <Text key={i} style={styles.bullet}>{b}</Text>
              ))}
            </View>
          ) : null}
        </View>

        {/* CTA button */}
        <TouchableOpacity
          style={styles.btn}
          onPress={() => {
            if (isLast) {
              onComplete();
            } else {
              setStep((s) => s + 1);
            }
          }}
          accessibilityRole="button"
        >
          <Text style={styles.btnText}>
            {isLast ? "Get Started 🎉" : "Next →"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8f9fa" },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ddd",
  },
  dotActive: {
    backgroundColor: "#1565c0",
    width: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  emoji: { fontSize: 56, marginBottom: 16 },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1a1a2e",
    textAlign: "center",
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
  },
  bullets: {
    alignSelf: "flex-start",
    width: "100%",
    marginTop: 4,
  },
  bullet: {
    fontSize: 15,
    color: "#333",
    marginBottom: 10,
    lineHeight: 22,
  },
  btn: {
    backgroundColor: "#1565c0",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: "100%",
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
