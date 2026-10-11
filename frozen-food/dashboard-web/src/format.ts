const num = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const dec = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const int = (v: number) => num.format(v);
export const one = (v: number) => dec.format(v);
/** Nilai dalam juta rupiah dengan satu desimal, mis. 883,3 jt (sama dengan notebook). */
export const jt = (v: number) => `${one(v)} jt`;
export const rp = (v: number) => `Rp${jt(v)}`;
export const pct = (v: number) => `${one(v)}%`;
