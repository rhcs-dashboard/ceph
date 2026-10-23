export enum HardwareNameMapping {
  memory = 'Memory',
  storage = 'Drive',
  processors = 'CPU',
  network = 'Network',
  power = 'Power supply',
  fans = 'Fan module',
  temperatures = 'Temperature'
}

export interface HardwareHealthCount {
  total: number;
  ok: number;
  warn: number;
  critical: number;
}

export interface HardwareSummary {
  total: {
    category: Record<string, HardwareHealthCount>;
    total: HardwareHealthCount;
  };
  host: Record<string, { flawed: boolean } | number>;
}

export interface CompressionStats {
  fcm_drive_count: number;
  phy_util_percent: number | null;
  log_util_percent: number | null;
  savings_bytes: number | null;
  compression_ratio: number | null;
  efficiency_percent: number | null;
}

export type HardwareHealth = 'OK' | 'Warning' | 'Critical' | 'Unknown';

export interface HardwareComponent {
  id: string;
  chassis_id: string;
  health: HardwareHealth;
  state: string;
  /* Sensor fields (fans, temperatures) */
  name?: string;
  physical_context?: string;
  reading?: number | 'unknown';
  reading_units?: string;
  [field: string]: unknown;
}

export interface HardwareCategory {
  health: HardwareHealth;
  total: number;
  ok: number;
  warning: number;
  critical: number;
  unknown: number;
  components: HardwareComponent[];
}

/* Response of GET /api/hardware/hosts/{hostname} */
export interface HardwareHost {
  hostname: string;
  sn: string;
  health: HardwareHealth;
  status: Record<keyof typeof HardwareNameMapping, HardwareCategory>;
  /* Installed firmware: name -> version */
  firmware: Record<string, string>;
}
