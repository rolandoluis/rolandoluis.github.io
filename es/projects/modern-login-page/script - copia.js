const container = document.getElementById('container');
const sideRegisterBtn = document.getElementById('register');
const sideLoginBtn = document.getElementById('login');

// Elementos de Modales
const modal2FA = document.getElementById('modal-2fa');
const modalPass = document.getElementById('modal-password');
const forgotPassLink = document.getElementById('forgot-password');
const modalConfirmReg = document.getElementById('modal-confirm-reg');

// Elementos de Registro
const regPassInput = document.getElementById('reg-pass');
const strengthBar = document.getElementById('strength-bar');
const strengthMeter = document.querySelector('.strength-meter');
const btnSubmitRegister = document.getElementById('btn-submit-register');
const btnSubmitLogin = document.getElementById('btn-submit-login');

// Regex para validación
const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,3}$/;
const passComplexRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[*\/+@#%&])[A-Za-z\d*\/+@#%&]{8,}$/;

// --- Lógica del "Ojo" en Iniciar Sesión (Nuevo) ---
const loginPassInput = document.getElementById('login-pass');
const toggleLoginPassword = document.getElementById('toggleLoginPass');

// --- Navegación de Paneles ---
sideRegisterBtn.addEventListener('click', () => container.classList.add("active"));
sideLoginBtn.addEventListener('click', () => container.classList.remove("active"));

const closeModals = () => {
    modal2FA.style.display = 'none';
    modalPass.style.display = 'none';
    modalConfirmReg.style.display = 'none';
};

// --- Lógica del "Ojo" (Ver/Ocultar) ---
document.getElementById('toggleRegPass').addEventListener('click', function() {
    const isPassword = regPassInput.getAttribute('type') === 'password';
    regPassInput.setAttribute('type', isPassword ? 'text' : 'password');
    
    // Cambiar icono
    this.classList.toggle('fa-eye');
    this.classList.toggle('fa-eye-slash');
});

// --- Medidor de Fuerza en Tiempo Real ---
regPassInput.addEventListener('input', () => {
    const val = regPassInput.value;
    strengthMeter.style.visibility = val.length > 0 ? 'visible' : 'hidden';
    
    let score = 0;
    if (val.length >= 8) score++; 
    if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++; 
    if (/\d/.test(val) && /[*\/+@#%&]/.test(val)) score++; 

    strengthBar.className = 'strength-bar'; 
    if (score === 1) strengthBar.classList.add('weak');
    if (score === 2) strengthBar.classList.add('medium');
    if (score === 3) strengthBar.classList.add('strong');
});

// --- Validación de Registro ---
const showError = (input, message) => {
    const group = input.closest('.input-group');
    const errorDisplay = group.querySelector('.error-msg');
    // Quitamos y ponemos la clase para reiniciar la animación de vibración
    input.classList.remove('invalid');
    void input.offsetWidth; // Truco para forzar el reinicio de la animación en el navegador
    input.classList.add('invalid');
    errorDisplay.innerText = message;
    errorDisplay.style.visibility = 'visible';
};

const clearError = (input) => {
    const group = input.closest('.input-group');
    const errorDisplay = group.querySelector('.error-msg');
    input.classList.remove('invalid');
    errorDisplay.style.visibility = 'hidden';
};

btnSubmitRegister.addEventListener('click', (e) => {
    e.stopPropagation(); 
    let isFormValid = true;

    const name = document.getElementById('reg-name');
    const email = document.getElementById('reg-email');

    if (name.value.trim().length < 2) {
        showError(name, "El nombre es obligatorio");
        isFormValid = false;
    } else { clearError(name); }

    if (!emailRegex.test(email.value)) {
        showError(email, "Email no válido (ej@mail.com)");
        isFormValid = false;
    } else { clearError(email); }

    if (!passComplexRegex.test(regPassInput.value)) {
        showError(regPassInput, "Mín. 8 car., Mayús, Núm y Símbolo (*/+@#%&)");
        isFormValid = false;
    } else { clearError(regPassInput); }

    if (isFormValid) {
        modalConfirmReg.style.display = 'flex';
    }
});

btnSubmitLogin.addEventListener('click', (e) => {
    e.stopPropagation();
    let isLoginValid = true;

    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-pass');

    // 1. Validar Email
    if (!emailInput.value.trim()) {
        showError(emailInput, "El correo es obligatorio");
        isLoginValid = false;
    } else if (!emailRegex.test(emailInput.value)) {
        showError(emailInput, "Formato: usuario@dominio.com");
        isLoginValid = false;
    } else { 
        clearError(emailInput); 
    }

    // 2. Validar Contraseña (solo presencia para login)
    if (!passInput.value.trim()) {
        showError(passInput, "La contraseña es obligatoria");
        isLoginValid = false;
    } else { 
        clearError(passInput); 
    }

    // 3. Si todo es correcto, disparamos el 2FA
    if (isLoginValid) {
        modal2FA.style.display = 'flex';
    }
});

forgotPassLink.addEventListener('click', (e) => {
    e.preventDefault(); // Evita que la página recargue
    modalPass.style.display = 'flex'; // Muestra el modal de cambio de clave
});

toggleLoginPassword.addEventListener('click', function() {
    // 1. Alternar el tipo de input (password <-> text)
    const isPassword = loginPassInput.getAttribute('type') === 'password';
    loginPassInput.setAttribute('type', isPassword ? 'text' : 'password');
    
    // 2. Alternar el icono (ojo / ojo-tachado)
    this.classList.toggle('fa-eye');
    this.classList.toggle('fa-eye-slash');
});

// Limpiar errores mientras el usuario escribe (aplica para Login y Registro)
document.querySelectorAll('.input-group input').forEach(input => {
    input.addEventListener('input', () => {
        if (input.classList.contains('invalid')) {
            clearError(input);
        }
    });
});