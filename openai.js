import OpenAI from "openai";
const openai = new OpenAI(process.env.OPENAI_API_KEY);

// Exemplo de função fictícia codificada para retornar o mesmo clima
// Na produção, isso poderia ser sua API de backend ou uma API externa
function obterClimaAtual(local, unidade = "fahrenheit") {
  if (local.toLowerCase().includes("tokyo")) {
    return JSON.stringify({
      local: "Tokyo",
      temperatura: "10",
      unidade: "celsius",
    });
  } else if (local.toLowerCase().includes("san francisco")) {
    return JSON.stringify({
      local: "San Francisco",
      temperatura: "72",
      unidade: "fahrenheit",
    });
  } else if (local.toLowerCase().includes("paris")) {
    return JSON.stringify({
      local: "Paris",
      temperatura: "22",
      unidade: "fahrenheit",
    });
  } else {
    return JSON.stringify({ local, temperatura: "desconhecida" });
  }
}

async function executarConversa() {
  // Passo 1: envie a conversa e as funções disponíveis para o modelo
  const mensagens = [
    {
      papel: "usuario",
      conteudo: "Como está o clima em San Francisco, Tokyo e Paris?",
    },
  ];
  const ferramentas = [
    {
      tipo: "funcao",
      funcao: {
        nome: "obter_clima_atual",
        descricao: "Obter o clima atual em um determinado local",
        parametros: {
          tipo: "objeto",
          propriedades: {
            local: {
              tipo: "string",
              descricao: "A cidade e o estado, por exemplo, San Francisco, CA",
            },
            unidade: { tipo: "string", enum: ["celsius", "fahrenheit"] },
          },
          obrigatorio: ["local"],
        },
      },
    },
  ];

  const resposta = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-1106",
    mensagens: mensagens,
    ferramentas: ferramentas,
    escolha_ferramenta: "auto", // auto é o padrão, mas vamos ser explícitos
  });
  const mensagemResposta = resposta.choices[0].message;

  // Passo 2: verifique se o modelo queria chamar uma função
  const chamadasFerramenta = mensagemResposta.tool_calls;
  if (mensagemResposta.tool_calls) {
    // Passo 3: chame a função
    // Nota: a resposta JSON pode nem sempre ser válida; certifique-se de tratar erros
    const funcoesDisponiveis = {
      obter_clima_atual: obterClimaAtual,
    }; // apenas uma função neste exemplo, mas você pode ter várias
    mensagens.push(mensagemResposta); // estenda a conversa com a resposta do assistente
    for (const chamadaFerramenta of chamadasFerramenta) {
      const nomeFuncao = chamadaFerramenta.function.name;
      const funcaoParaChamar = funcoesDisponiveis[nomeFuncao];
      const argumentosFuncao = JSON.parse(chamadaFerramenta.function.arguments);
      const respostaFuncao = funcaoParaChamar(
        argumentosFuncao.local,
        argumentosFuncao.unidade
      );
      mensagens.push({
        id_chamada_ferramenta: chamadaFerramenta.id,
        papel: "ferramenta",
        nome: nomeFuncao,
        conteudo: respostaFuncao,
      }); // estenda a conversa com a resposta da função
    }
    const segundaResposta = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      mensagens: mensagens,
    }); // obtenha uma nova resposta do modelo onde ele pode ver a resposta da função
    return segundaResposta.choices;
  }
}

const resposta = await executarConversa();
console.log(resposta);
