export type SensorCategory = "cpu" | "gpu" | "storage" | "other";

export interface HwmonSensorInput {
    chip: string;
    name: string;
    label?: string;
    value: string | number;
}

export interface HwmonSensor {
    chip: string;
    name: string;
    label: string;
    millidegreesCelsius: number;
    degreesCelsius: number;
    category: SensorCategory;
}

const categoryPatterns: readonly [SensorCategory, readonly RegExp[]][] = [
    ["cpu", [/^coretemp$/i, /^k10temp$/i, /^zenpower$/i, /cpu/i]],
    ["gpu", [/^amdgpu$/i, /^nouveau$/i, /^nvidia$/i, /gpu/i]],
    ["storage", [/^nvme$/i, /drivetemp/i, /storage/i]],
];

export const classifyChip = (chip: string): SensorCategory => {
    const normalized = chip.trim();
    for (const [category, patterns] of categoryPatterns) {
        if (patterns.some((pattern) => pattern.test(normalized))) {
            return category;
        }
    }
    return "other";
};

export const parseHwmon = (
    inputs: readonly HwmonSensorInput[],
): HwmonSensor[] =>
    inputs.flatMap((input) => {
        const millidegreesCelsius =
            typeof input.value === "number"
                ? input.value
                : Number.parseFloat(input.value.trim());
        if (!Number.isFinite(millidegreesCelsius)) {
            return [];
        }
        const name = input.name.trim();
        const chip = input.chip.trim();
        if (!name || !chip) {
            return [];
        }
        return [
            {
                chip,
                name,
                label: input.label?.trim() || name,
                millidegreesCelsius,
                degreesCelsius: millidegreesCelsius / 1000,
                category: classifyChip(chip),
            },
        ];
    });

export const selectSensors = (
    sensors: readonly HwmonSensor[],
    category: SensorCategory,
): HwmonSensor[] => sensors.filter((sensor) => sensor.category === category);
