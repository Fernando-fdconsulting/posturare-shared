export const removeMask = (value) => {
  if (!value) return '';
  return value.replace(/\D/g, '');
};

export const formatCPF = (value) => {
  if (!value) return '';
  let cleaned = removeMask(value);
  if (cleaned.length > 11) cleaned = cleaned.slice(0, 11);

  return cleaned
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2');
};

export const formatPhone = (value) => {
  if (!value) return '';
  let cleaned = removeMask(value);
  if (cleaned.length > 11) cleaned = cleaned.slice(0, 11);

  if (cleaned.length <= 10) {
    return cleaned
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return cleaned
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
};

export const formatCEP = (value) => {
  if (!value) return '';
  let cleaned = removeMask(value);
  if (cleaned.length > 8) cleaned = cleaned.slice(0, 8);

  return cleaned.replace(/(\d{5})(\d)/, '$1-$2');
};

export const validateCPF = (cpf) => {
  if (!cpf) return false;
  const cleaned = removeMask(cpf);
  if (cleaned.length !== 11) return false;

  // Basic invalid arrays
  if (/^(\d)\1+$/.test(cleaned)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum = sum + parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum = sum + parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;

  return true;
};

export const validateEmail = (email) => {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const normalizarTelefone = (value) => {
  if (!value) return '';
  let cleaned = value.toString().replace(/\D/g, '');

  // If it already starts with 55 and has the correct length, keep it
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    return cleaned;
  }

  // If it has standard Brazilian length without DDI, prepend 55
  if (cleaned.length === 10 || cleaned.length === 11) {
    return `55${cleaned}`;
  }

  return cleaned;
};

export const formatarTelefoneExibicao = (value) => {
  if (!value) return '';
  let cleaned = value.toString().replace(/\D/g, '');

  if (!cleaned) return value;

  // Handles standard DDI formats
  if (cleaned.length === 12 || cleaned.length === 13) {
    if (cleaned.startsWith('55')) {
      const ddd = cleaned.slice(2, 4);
      const isMobile = cleaned.length === 13;
      const p1 = cleaned.slice(4, isMobile ? 9 : 8);
      const p2 = cleaned.slice(isMobile ? 9 : 8);
      return `+55 (${ddd}) ${p1}-${p2}`;
    }
  }
  // Handles missing DDI inputs gracefully
  else if (cleaned.length === 10 || cleaned.length === 11) {
    const ddd = cleaned.slice(0, 2);
    const isMobile = cleaned.length === 11;
    const p1 = cleaned.slice(2, isMobile ? 7 : 6);
    const p2 = cleaned.slice(isMobile ? 7 : 6);
    return `+55 (${ddd}) ${p1}-${p2}`;
  }

  // Returns original if format isn't recognized
  return value;
};

export const formatWhatsApp = (value) => {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '');
  return cleaned.slice(0, 15);
};
