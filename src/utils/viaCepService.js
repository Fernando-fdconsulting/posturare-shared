export const fetchAddressByCEP = async (cep) => {
  try {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      throw new Error('CEP inválido');
    }

    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();

    if (data.erro) {
      throw new Error('CEP não encontrado');
    }

    return {
      endereco: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf,
      complemento: data.complemento || ''
    };
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    throw error;
  }
};
