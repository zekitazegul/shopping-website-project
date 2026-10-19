export function buildFeedbackMailto(address, subject, body) {
  return `mailto:${address}?subject=${encodeURIComponent(subject.replace(/[\r\n]+/g,' ').trim())}&body=${encodeURIComponent(body)}`;
}

export function setupFeedback() {
  const form = document.getElementById('feedback-form');
  const email = document.getElementById('feedback-email');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const address = new URL(form.action).pathname;
    email.href = buildFeedbackMailto(address, form.elements.subject.value, form.elements.body.value);
    email.click();
  });
}
