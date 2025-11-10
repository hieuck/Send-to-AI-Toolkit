function getMsg(key, fallback) {
  return (chrome && chrome.i18n && chrome.i18n.getMessage(key)) || fallback || key;
}
