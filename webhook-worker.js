// Cloudflare Worker — Webhook Holmes → Firebase (Criar Projeto Stand-by + Projetos Tabela)

const FIREBASE_URL = "https://plataforma-obras-913a8-default-rtdb.firebaseio.com";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    if (request.method === "GET") {
      return jsonResponse(200, { status: "ok", message: "Webhook ativo." });
    }

    if (request.method === "POST") {
      try {
        const rawBody = await request.text();

        if (!rawBody || !rawBody.trim()) {
          return jsonResponse(200, { status: "ok", message: "Webhook recebido com sucesso." });
        }

        let body;
        try {
          body = JSON.parse(rawBody);
        } catch (e) {
          return jsonResponse(200, { status: "ok", message: "Body nao e JSON valido." });
        }

        const props = body.properties || {};
        const nomeProjeto =
          props["Nome do Projeto"] ||
          props["nome do projeto"] ||
          props["Nome_do_Projeto"] ||
          props["nome_do_projeto"] ||
          props["NOME DO PROJETO"] ||
          body.nome_do_projeto ||
          body["Nome do Projeto"] ||
          body.name ||
          body.nome ||
          null;

        if (!nomeProjeto || !String(nomeProjeto).trim()) {
          return jsonResponse(200, {
            status: "ok",
            message: "Campo Nome do Projeto nao encontrado.",
            campos_properties: Object.keys(props),
          });
        }

        const nomeClean = String(nomeProjeto).trim();

        // ─── Extrair todos os dados do Holmes ───
        const endereco = props["Endereço do Projeto"] || props["Endereco do Projeto"] || "";
        const municipio = props["Município do Projeto"] || props["Municipio do Projeto"] || "";
        const duracao = props["Tempo de execução (dias úteis)"] || props["Tempo de execucao (dias uteis)"] || "";
        const duracaoLocacao = props["Tempo de Locação (dias corridos)"] || props["Tempo de Locacao (dias corridos)"] || "";
        const contratante = props["Nome da Empresa"] || "";
        const cnpjContrato = props["CNPJ Contrato"] || "";
        const cnpjFaturamento = props["CNPJ Faturamento"] || "";
        const segmentacao = props["Segmentação"] || props["Segmentacao"] || "";
        const qualTrabalho = props["Qual o Trabalho"] || "";
        const escopo = props["Escopo do Projeto"] || "";
        const valor = props["Valor"] || 0;
        const fonte = props["Fonte"] || "";
        const vendedor = props["Vendedor"] || "";
        const formaPagamento = props["Forma de Pagamento"] || "";
        const obsPagamento = props["Observação Forma de Pagamento"] || props["Observacao Forma de Pagamento"] || "";
        const garantia = props["Garantia"] || "";
        const tipoContrato = props["Tipo de Contrato"] || "";
        const assinaturaContrato = props["Assinatura do Contrato"] || "";
        const atualizacaoContratual = props["Atualização Contratual"] || props["Atualizacao Contratual"] || "";
        const numProposta = props["Número da Proposta"] || props["Numero da Proposta"] || "";
        const nomeNegociacao = props["Nome da Negociação"] || props["Nome da Negociacao"] || "";
        const dataFechamento = props["Data de Fechamento"] || "";
        const dataVisita = props["Data da Visita Técnica"] || props["Data da Visita Tecnica"] || "";
        const dataAlinhamento = props["Data da Reunião de Alinhamento"] || props["Data da Reuniao de Alinhamento"] || "";
        const nomeContato = props["Nome do Contato"] || "";
        const telContato = props["Telefone do Contato"] || "";
        const emailContato = props["E-mail do Contato"] || "";
        const cargoContato = props["Cargo do Contato"] || "";
        const codigoProjeto = props["Código do Projeto (API)"] || props["Codigo do Projeto (API)"] || "";

        // ─── Buscar projetos existentes ───
        const projRes = await fetch(FIREBASE_URL + "/projects.json");
        const projData = await projRes.json();

        let maxId = 0;
        let totalProjects = 0;
        if (projData) {
          const arr = Array.isArray(projData) ? projData : Object.values(projData);
          arr.forEach((p) => {
            if (p && p.id && p.id > maxId) maxId = p.id;
            if (p) totalProjects++;
          });
        }

        const newId = maxId + 1;
        const nextIndex = totalProjects;

        // ─── Criar projeto no Kanban (Stand-by) ───
        const newProject = {
          id: newId,
          name: nomeClean,
          stage: "standby",
          startDate: "",
          endDate: "",
          local: endereco ? endereco + (municipio ? " - " + municipio : "") : "",
          duration: duracao ? duracao + " dias" : "",
          contratante: contratante,
          items: [],
          materials: [],
          collabs: [],
          progress: 0,
          contratoAssinado: false,
          createdAt: Date.now(),
          createdBy: "webhook-holmes",
          holmesId: body.id || "",
        };

        await fetch(FIREBASE_URL + "/projects/" + nextIndex + ".json", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newProject),
        });

        await fetch(FIREBASE_URL + "/nextId.json", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newId + 1),
        });

        // ─── Salvar em Projetos Tabela (dados completos do Holmes) ───
        const projetoTabela = {
          projectId: newId,
          holmesId: body.id || "",
          nome: nomeClean,
          contratante: contratante,
          cnpjContrato: cnpjContrato,
          cnpjFaturamento: cnpjFaturamento,
          segmentacao: segmentacao,
          tipoTrabalho: qualTrabalho,
          escopo: escopo,
          valor: valor,
          fonte: fonte,
          vendedor: vendedor,
          formaPagamento: formaPagamento,
          obsPagamento: obsPagamento,
          garantia: garantia,
          tipoContrato: tipoContrato,
          assinaturaContrato: assinaturaContrato,
          atualizacaoContratual: atualizacaoContratual,
          numProposta: numProposta,
          nomeNegociacao: nomeNegociacao,
          endereco: endereco,
          municipio: municipio,
          duracaoExecucao: duracao,
          duracaoLocacao: duracaoLocacao,
          dataFechamento: dataFechamento,
          dataVisita: dataVisita,
          dataAlinhamento: dataAlinhamento,
          contato: {
            nome: nomeContato,
            telefone: telContato,
            email: emailContato,
            cargo: cargoContato,
          },
          codigoProjeto: codigoProjeto,
          autor: body.author || {},
          documentos: (body.documents || []).map((d) => ({
            nome: d.name || "",
            status: d.status || "",
            documentId: d.document_id || "",
          })),
          createdAt: Date.now(),
          allProperties: props,
        };

        await fetch(FIREBASE_URL + "/projetosTabela.json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(projetoTabela),
        });

        return jsonResponse(200, {
          success: true,
          message: "Projeto '" + nomeClean + "' criado em Stand-by e salvo em Projetos Tabela.",
          projectId: newId,
        });
      } catch (err) {
        return jsonResponse(200, { status: "ok", error: err.message });
      }
    }

    return jsonResponse(200, { status: "ok" });
  },
};

function jsonResponse(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
