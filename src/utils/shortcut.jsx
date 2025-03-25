window.addEventListener("keydown", (e) => {
  if (!e.altKey) return;

  if (e.key.toLowerCase() === "j") {
    document.querySelector("input[name=id]").focus();
    e.preventDefault();
  } else if (!isNaN(parseInt(e.key))) {
    document
      .querySelectorAll(".chat-select-button")
      ?.[parseInt(e.key) - 1]?.click();
    e.preventDefault();
  } else if (e.key.toLowerCase() === "s") {
    document.querySelector("textarea[name=text]")?.focus();
    e.preventDefault();
  }
});
