import { CircleCheck, CircleDashed, CircleDot } from "lucide-react";

// Colour is reserved for status, so the rest of the board stays neutral.
const BOARD_STATUS_APPEARANCE = {
  new: {
    icon: CircleDot,
    iconClassName: "text-blue-500",
    swatchClassName: "bg-blue-500",
  },
  in_progress: {
    icon: CircleDashed,
    iconClassName: "text-amber-500",
    swatchClassName: "bg-amber-500",
  },
  resolved: {
    icon: CircleCheck,
    iconClassName: "text-success",
    swatchClassName: "bg-success",
  },
} as const;

export function getBoardStatusAppearance(status: string) {
  return status in BOARD_STATUS_APPEARANCE
    ? BOARD_STATUS_APPEARANCE[status as keyof typeof BOARD_STATUS_APPEARANCE]
    : BOARD_STATUS_APPEARANCE.new;
}
