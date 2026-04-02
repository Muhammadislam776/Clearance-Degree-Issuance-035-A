const tabButtons = document.querySelectorAll('.tab-btn');
const forms = {
  signup: document.getElementById('signupForm'),
  login: document.getElementById('loginForm'),
};
const signupRole = document.getElementById('signupRole');
const studentOnlyFields = document.querySelectorAll('.student-only');
const staffOnlyFields = document.querySelectorAll('.staff-only');
const messageEl = document.getElementById('formMessage');

function switchTab(tabName) {
  tabButtons.forEach((btn) => {
    const active = btn.dataset.tab === tabName;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  });

  Object.entries(forms).forEach(([name, form]) => {
    form.classList.toggle('active', name === tabName);
  });

  messageEl.textContent = '';
}

function updateRoleFields() {
  const role = signupRole.value;
  const isStudent = role === 'student';

  studentOnlyFields.forEach((field) => field.classList.toggle('hidden', !isStudent));
  staffOnlyFields.forEach((field) => field.classList.toggle('hidden', isStudent));
}

tabButtons.forEach((button) => {
  button.addEventListener('click', () => switchTab(button.dataset.tab));
});

signupRole.addEventListener('change', updateRoleFields);

forms.signup.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(forms.signup);
  messageEl.textContent = `Signup ready for ${data.get('role')} (${data.get('email')}). Connect this form to your backend API next.`;
  messageEl.style.color = '#047857';
});

forms.login.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(forms.login);
  messageEl.textContent = `Login attempt for ${data.get('loginRole')} (${data.get('loginEmail')}). Connect JWT auth endpoint next.`;
  messageEl.style.color = '#0369a1';
});

updateRoleFields();
