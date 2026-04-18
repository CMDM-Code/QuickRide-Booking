import { calculateTotalRental } from "./pricing-engine";

function testPricing() {
  const cases = [
    { start: "2026-04-11T08:00:00", end: "2026-04-11T13:00:00", r12: 1000, r24: 1600, driver: false, expected: 5 * 200 }, // 5 hours
    { start: "2026-04-11T08:00:00", end: "2026-04-11T20:00:00", r12: 1000, r24: 1600, driver: false, expected: 1000 },    // Exactly 12 hours
    { start: "2026-04-11T08:00:00", end: "2026-04-11T21:00:00", r12: 1000, r24: 1600, driver: false, expected: 1600 },    // 13 hours -> closer to 24/over 12
    { start: "2026-04-11T08:00:00", end: "2026-04-12T08:00:00", r12: 1000, r24: 1600, driver: false, expected: 1600 },    // 24 hours
    { start: "2026-04-11T08:00:00", end: "2026-04-12T14:00:00", r12: 1000, r24: 1600, driver: false, expected: 1600 + (6 * 200) }, // 30 hours (1 day + 6 hrs < 12)
    { start: "2026-04-11T08:00:00", end: "2026-04-12T20:00:00", r12: 1000, r24: 1600, driver: false, expected: 1600 + 1000 }, // 36 hours (1 day + 12 hrs block)
    { start: "2026-04-11T08:00:00", end: "2026-04-12T20:00:00", r12: 1000, r24: 1600, driver: true, expected: 1600 + 1000 + 1000 }, // With driver
  ];

  console.log("Running Pricing Tests...");
  cases.forEach((c, i) => {
    const result = calculateTotalRental(new Date(c.start), new Date(c.end), c.r12, c.r24, c.driver);
    const pass = result.totalPrice === c.expected;
    console.log(`Case ${i + 1}: ${pass ? "PASS" : "FAIL"} | Expected: ${c.expected}, Got: ${result.totalPrice}`);
    if (!pass) console.log("Breakdown:", result);
  });
}

testPricing();
