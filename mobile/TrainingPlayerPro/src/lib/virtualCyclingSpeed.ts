/**
 * Training Player Pro
 * Virtual Cycling Speed v0.1
 *
 * Används när en indoor-cykel skickar effekt (watt)
 * men inte skickar faktisk hastighet.
 *
 * Kurvan är kalibrerad mot exporterad MOWL-data:
 *
 *   km/h ≈ 3.86 × watt^0.407
 *
 * Vikt används inte i v0.1.
 * Vikt används separat för W/kg.
 *
 * Om en framtida cykel skickar riktig hastighet via BLE
 * ska den riktiga hastigheten alltid användas i stället.
 */

const SPEED_FACTOR = 3.86;
const POWER_EXPONENT = 0.407;

export function virtualCyclingSpeedKmh(
  powerWatts: number | null
): number | null {
  if (
    powerWatts === null ||
    !Number.isFinite(powerWatts)
  ) {
    return null;
  }

  if (powerWatts <= 0) {
    return 0;
  }

  return (
    SPEED_FACTOR *
    Math.pow(
      powerWatts,
      POWER_EXPONENT
    )
  );
}
