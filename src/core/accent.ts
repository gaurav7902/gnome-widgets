export interface Accent {
    name: string;
    value: string;
    text: string;
}

const accents: Record<string, Accent> = {
    blue: {name: "blue", value: "#3584e4", text: "#ffffff"},
    teal: {name: "teal", value: "#2190a4", text: "#ffffff"},
    green: {name: "green", value: "#33d17a", text: "#173b24"},
    yellow: {name: "yellow", value: "#f6d32d", text: "#3d3200"},
    orange: {name: "orange", value: "#ff7800", text: "#ffffff"},
    red: {name: "red", value: "#e01b24", text: "#ffffff"},
    purple: {name: "purple", value: "#9141ac", text: "#ffffff"},
};

export const accentFor = (name: string | null | undefined): Accent =>
    accents[name ?? "blue"] ?? accents.blue;
