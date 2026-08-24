/**
 * Numerically stable Softmax function.
 * Computes softmax over a 1D array of logits.
 */
export function softmax(logits: Float32Array | number[]): Float32Array {
  const arr = Array.isArray(logits) ? logits : Array.from(logits);
  const maxLogit = Math.max(...arr);
  const exps = arr.map((val) => Math.exp(val - maxLogit));
  const sumExps = exps.reduce((sum, val) => sum + val, 0);
  return new Float32Array(exps.map((val) => val / sumExps));
}
