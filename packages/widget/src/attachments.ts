import type { Labels } from "@fasterfixes/core";
import {
  COMMENT_ATTACHMENT_MAX_BYTES,
  COMMENT_ATTACHMENT_MAX_FILES,
  COMMENT_ATTACHMENT_TYPES,
} from "@fasterfixes/core";

export type AttachmentPicker = {
  /** The paperclip that opens the file dialog. */
  trigger: HTMLButtonElement;
  /** The hidden file input; place it anywhere in the form. */
  input: HTMLInputElement;
  /** The chips for the chosen files, in order. */
  list: HTMLUListElement;
  files: () => readonly File[];
  reset: () => void;
  setDisabled: (disabled: boolean) => void;
};

/**
 * The paperclip and removable file chips both composers share (ADR-0026).
 * Chosen files are checked against the shared limits here; the caller uploads
 * them and decides what a failure means.
 */
export function createAttachmentPicker(
  document: Document,
  labels: Labels,
): AttachmentPicker {
  const chosen: File[] = [];

  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.hidden = true;
  input.accept = COMMENT_ATTACHMENT_TYPES.join(",");

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "action attach-file";
  trigger.textContent = labels.attachFile;
  trigger.addEventListener("click", () => input.click());

  const list = document.createElement("ul");
  list.className = "attach-files";

  function createChip(file: File, index: number) {
    const chip = document.createElement("li");
    chip.className = "attach-file-chip";
    const name = document.createElement("span");
    name.className = "attach-file-name";
    name.textContent = file.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "attach-file-remove";
    remove.setAttribute("aria-label", `Remove ${file.name}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      chosen.splice(index, 1);
      render();
    });
    chip.append(name, remove);
    return chip;
  }

  function render() {
    list.replaceChildren(...chosen.map(createChip));
  }

  input.addEventListener("change", () => {
    const selected = [...(input.files ?? [])];
    input.value = "";
    for (const file of selected) {
      if (chosen.length >= COMMENT_ATTACHMENT_MAX_FILES) break;
      if (file.size > COMMENT_ATTACHMENT_MAX_BYTES) continue;
      chosen.push(file);
    }
    render();
  });

  return {
    trigger,
    input,
    list,
    files: () => [...chosen],
    reset() {
      chosen.length = 0;
      input.value = "";
      render();
    },
    setDisabled(disabled: boolean) {
      trigger.disabled = disabled;
      for (const button of list.querySelectorAll("button")) {
        button.disabled = disabled;
      }
    },
  };
}
