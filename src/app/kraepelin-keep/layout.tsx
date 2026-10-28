import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kraepelin Keep",
  description:
    "Defend the keep with math — the last digit of the answer is the spell.",
};

export default function KraepelinKeepLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
