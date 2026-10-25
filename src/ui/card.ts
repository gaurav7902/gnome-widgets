import St from "gi://St";
import type {Theme} from "../core/theme.js";

export type GlassTier = 0 | 1;

export interface CardOptions {
    theme: Theme;
    tier?: GlassTier;
    style?: {
        radius?: number;
        opacity?: number | null;
    };
}

export class Card {
    readonly actor: InstanceType<typeof St.Widget>;
    private readonly tier: GlassTier;
    private readonly style: CardOptions["style"];

    constructor(actor: InstanceType<typeof St.Widget>, options: CardOptions) {
        this.actor = actor;
        this.tier = options.tier ?? 0;
        this.style = options.style;
        this.applyTheme(options.theme);
    }

    applyTheme(theme: Theme): void {
        this.actor.add_style_class_name?.("lm-card");
        this.actor.add_style_class_name?.(`lm-card-tier-${this.tier}`);
        this.actor.set_style(
            [
                theme.styleFor(this.style),
                `border-color: ${theme.palette.border};`,
            ].join(" "),
        );
    }

    destroy(): void {
        this.actor.destroy();
    }
}

export const createCard = (options: CardOptions): Card => {
    const actor = new St.Widget({
        reactive: false,
        can_focus: false,
        style_class: "lm-card",
    });
    return new Card(actor, options);
};
