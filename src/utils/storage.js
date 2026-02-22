/* Safe JSON parse */
const parse = (value, fallback) => {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
};

/* Get data */
export const getStorage = (key, fallback = []) => {
  return parse(localStorage.getItem(key), fallback);
};

/* Set data + notify app */
export const setStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("storage"));
};

/* Remove data */
export const removeStorage = (key) => {
  localStorage.removeItem(key);
  window.dispatchEvent(new Event("storage"));
};
