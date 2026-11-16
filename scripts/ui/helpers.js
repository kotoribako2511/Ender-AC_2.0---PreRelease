import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { t } from "../state.js";
import { notify } from "../util/notify.js";
export function formatRelativeTime(timestamp) {
    const sec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (sec < 60)
        return t(`${sec}秒前`, `${sec}s ago`);
    if (sec < 3600)
        return t(`${Math.floor(sec / 60)}分前`, `${Math.floor(sec / 60)}m ago`);
    return t(`${Math.floor(sec / 3600)}時間前`, `${Math.floor(sec / 3600)}h ago`);
}
export function paginate(items, page, pageSize) {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const currentPage = Math.min(Math.max(0, page), totalPages - 1);
    return {
        pageItems: items.slice(currentPage * pageSize, (currentPage + 1) * pageSize),
        currentPage,
        totalPages,
    };
}
export function buildPaginationButtons(form, currentPage, totalPages, extra = []) {
    if (currentPage > 0)
        form.button(t("§l前へ", "§lPrev"));
    if (currentPage < totalPages - 1)
        form.button(t("§l次へ", "§lNext"));
    for (const b of extra)
        form.button(b.label, b.icon);
}
export function handlePaginationSelection(selection, currentPage, totalPages, onPrev, onNext, onExtra, extraCount) {
    let idx = 0;
    if (currentPage > 0 && selection === idx++)
        return onPrev();
    if (currentPage < totalPages - 1 && selection === idx++)
        return onNext();
    const extraIdx = selection - idx;
    if (extraIdx >= 0 && extraIdx < extraCount)
        return onExtra(extraIdx);
}
export function confirm(player, options) {
    return new Promise((resolve) => {
        new ActionFormData()
            .title(options.title)
            .body(options.body)
            .button(options.yes ?? t("§4§lはい", "§4§lYes"))
            .button(options.no ?? t("§lキャンセル", "§lCancel"))
            .show(player)
            .then(({ canceled, selection }) => resolve(!canceled && selection === 0))
            .catch(() => resolve(false));
    });
}
export function textInput(player, options) {
    return new Promise((resolve) => {
        const form = new ModalFormData().title(options.title);
        form.textField(options.label, options.placeholder ?? "", { defaultValue: options.defaultValue });
        if (options.allowDelete)
            form.toggle(t("§c値を削除する", "§cDelete value"), { defaultValue: false });
        form.show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return resolve({ canceled: true, value: "", deleteValue: false });
            resolve({
                canceled: false,
                value: String(formValues[0] ?? "").replace(/\\n/g, "\n"),
                deleteValue: Boolean(formValues[1]),
            });
        })
            .catch(() => resolve({ canceled: true, value: "", deleteValue: false }));
    });
}
export function safeString(str, max) {
    return str.length > max ? `${str.slice(0, max)}...` : str;
}
export function backToMain(player) {
    import("./main-menu.js")
        .then((m) => m.MainMenuUI.showMainMenu(player))
        .catch(() => { });
}
export function addListEditFields(form, current, addLabel, placeholder, removeLabel) {
    form.textField(`${addLabel} §r§7(現在 ${current.length}件)`, placeholder);
    form.dropdown(removeLabel, [t("(削除しない)", "(do not remove)"), ...current], { defaultValueIndex: 0 });
}
export function parseListEdit(addRaw, removeIdx, current) {
    let next = [...current];
    const idx = Number(removeIdx);
    if (idx > 0 && idx <= next.length) {
        next = next.filter((_, i) => i !== idx - 1);
    }
    const add = String(addRaw ?? "").trim();
    if (add && !next.includes(add))
        next.push(add);
    return next;
}
export function saveAndBack(player, ja, en, back) {
    notify(player, t(ja, en));
    back();
}
