import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  BleManager,
  Device,
  Subscription,
} from "@sfourdrinier/react-native-ble-plx";

const HEART_RATE_SERVICE = "180D";
const HEART_RATE_MEASUREMENT = "2A37";

export default function DeviceManagerScreen() {
  const bleManager = useRef(new BleManager()).current;

  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const heartRateSubscription = useRef<Subscription | null>(null);

  useEffect(() => {
    return () => {
      heartRateSubscription.current?.remove();
      bleManager.stopDeviceScan();
      bleManager.destroy();
    };
  }, [bleManager]);

  const scanForDevices = () => {
    setDevices([]);
    setIsScanning(true);

    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log("BLE scan error:", error);
        setIsScanning(false);
        return;
      }

      if (!device) return;

      const name = device.name || device.localName;
      if (!name) return;

      setDevices((currentDevices) => {
        const exists = currentDevices.some(
          (existingDevice) => existingDevice.id === device.id
        );

        if (exists) {
          return currentDevices.map((existingDevice) =>
            existingDevice.id === device.id ? device : existingDevice
          );
        }

        return [...currentDevices, device];
      });
    });

    setTimeout(() => {
      bleManager.stopDeviceScan();
      setIsScanning(false);
    }, 10000);
  };

  const connectToHeartRateDevice = async (device: Device) => {
    try {
      bleManager.stopDeviceScan();
      setIsScanning(false);
      setHeartRate(null);

      const connected = await device.connect();
      const discovered =
        await connected.discoverAllServicesAndCharacteristics();

      setConnectedDevice(discovered);

      heartRateSubscription.current?.remove();

      heartRateSubscription.current =
        discovered.monitorCharacteristicForService(
          HEART_RATE_SERVICE,
          HEART_RATE_MEASUREMENT,
          (error, characteristic) => {
            if (error) {
              console.log("Heart rate monitor error:", error);
              return;
            }

            if (!characteristic?.value) return;

            const bytes = Uint8Array.from(
              atob(characteristic.value),
              (c) => c.charCodeAt(0)
            );

            const flags = bytes[0];
            const is16Bit = (flags & 0x01) !== 0;

            const bpm = is16Bit
              ? bytes[1] | (bytes[2] << 8)
              : bytes[1];

            setHeartRate(bpm);
          }
        );
    } catch (error) {
      console.log("Connection error:", error);
    }
  };

  const sortedDevices = [...devices].sort(
    (a, b) => (b.rssi ?? -999) - (a.rssi ?? -999)
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Training Player Pro</Text>
      <Text style={styles.subtitle}>Device Manager</Text>

      <Pressable
        style={[
          styles.scanButton,
          isScanning && styles.scanButtonDisabled,
        ]}
        onPress={scanForDevices}
        disabled={isScanning}
      >
        <Text style={styles.scanButtonText}>
          {isScanning ? "Scanning..." : "Scan for devices"}
        </Text>
      </Pressable>

      {connectedDevice && (
        <View style={styles.connectedCard}>
          <Text style={styles.connectedLabel}>Connected</Text>
          <Text style={styles.connectedName}>
            {connectedDevice.name ||
              connectedDevice.localName ||
              "Unknown device"}
          </Text>

          <Text style={styles.heartRate}>
            ❤️ {heartRate ?? "--"} bpm
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>
        Found devices ({sortedDevices.length})
      </Text>

      <FlatList
        data={sortedDevices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => connectToHeartRateDevice(item)}
            style={styles.deviceCard}
          >
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>
                {item.name || item.localName}
              </Text>

              <Text style={styles.deviceHint}>
                Tap to connect
              </Text>

              <Text style={styles.deviceId}>
                {item.id}
              </Text>
            </View>

            <Text style={styles.rssi}>
              {item.rssi ?? "?"} dBm
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No named Bluetooth devices found yet.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    marginTop: 24,
  },

  subtitle: {
    fontSize: 18,
    color: "#666666",
    marginTop: 4,
    marginBottom: 24,
  },

  scanButton: {
    backgroundColor: "#111111",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
  },

  scanButtonDisabled: {
    opacity: 0.5,
  },

  scanButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },

  connectedCard: {
    backgroundColor: "#f2f2f2",
    borderRadius: 14,
    padding: 18,
    marginBottom: 24,
  },

  connectedLabel: {
    fontSize: 12,
    color: "#666666",
  },

  connectedName: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 3,
  },

  heartRate: {
    fontSize: 34,
    fontWeight: "700",
    marginTop: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },

  deviceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },

  deviceInfo: {
    flex: 1,
    paddingRight: 10,
  },

  deviceName: {
    fontSize: 16,
    fontWeight: "500",
  },

  deviceHint: {
    fontSize: 13,
    marginTop: 3,
    color: "#444444",
  },

  deviceId: {
    fontSize: 12,
    color: "#888888",
    marginTop: 4,
  },

  rssi: {
    fontSize: 13,
    color: "#666666",
  },

  emptyText: {
    color: "#888888",
    marginTop: 10,
  },
});