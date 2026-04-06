// Cloudflare Worker — Webhook Holmes → Firebase (Atualizar Status Contrato)
// Quando Holmes aciona este webhook, marca contratoAssinado = true no projeto correspondente

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
      return jsonResponse(200, { status: "ok", message: "Webhook contrato ativo." });
    }

    if (request.method === "POST") {
      try {
        const rawBody = await request.text();

        // Holmes envia POST vazio ao testar — aceitar sem erro
        if (!rawBody || !rawBody.trim()) {
          return jsonResponse(200, { status: "ok", message: "Webhook contrato recebido com sucesso." });
        }

        let body;
        try {
          body = JSON.parse(rawBody);
        } catch (e) {
          return jsonResponse(200, { status: "ok", message: "Body nao e JSON valido." });
        }

        // ─── Identificar o projeto ───
        const props = body.properties || {};
        const holmesId = body.id || "";
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

        if (!holmesId && !nomeProjeto) {
          return jsonResponse(200, {
            status: "ok",
            message: "Nenhum identificador encontrado (holmesId ou Nome do Projeto).",
          });
        }

        // ─── Buscar projetos no Firebase ───
        const projRes = await fetch(FIREBASE_URL + "/projects.json");
        const projData = await projRes.json();

        if (!projData) {
          return jsonResponse(200, { status: "ok", message: "Nenhum projeto encontrado no banco." });
        }

        // Converter para array com índices
        const entries = Array.isArray(projData)
          ? projData.map((p, i) => [i, p])
          : Object.entries(projData);

        let foundIndex = null;
        let foundProject = null;

        for (const [idx, p] of entries) {
          if (!p) continue;

          // Prioridade 1: buscar por holmesId
          if (holmesId && p.holmesId === holmesId) {
            foundIndex = idx;
            foundProject = p;
            break;
          }

          // Prioridade 2: buscar por nome do projeto
          if (nomeProjeto && p.name && p.name.trim().toLowerCase() === String(nomeProjeto).trim().toLowerCase()) {
            foundIndex = idx;
            foundProject = p;
            // Não dar break — continuar buscando por holmesId (mais preciso)
          }
        }

        if (foundIndex === null || !foundProject) {
          return jsonResponse(200, {
            status: "ok",
            message: "Projeto nao encontrado.",
            holmesId: holmesId,
            nomeProjeto: nomeProjeto,
          });
        }

        // ─── Atualizar contratoAssinado para true ───
        await fetch(FIREBASE_URL + "/projects/" + foundIndex + "/contratoAssinado.json", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(true),
        });

        // ─── Atualizar também em projetosTabela (se existir) ───
        const tabelaRes = await fetch(FIREBASE_URL + "/projetosTabela.json");
        const tabelaData = await tabelaRes.json();

        if (tabelaData) {
          for (const [key, item] of Object.entries(tabelaData)) {
            if (!item) continue;
            const match =
              (holmesId && item.holmesId === holmesId) ||
              (nomeProjeto && item.nome && item.nome.trim().toLowerCase() === String(nomeProjeto).trim().toLowerCase());

            if (match) {
              await fetch(FIREBASE_URL + "/projetosTabela/" + key + "/contratoAssinado.json", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(true),
              });
              break;
            }
          }
        }

        return jsonResponse(200, {
          success: true,
          message: "Contrato do projeto '" + foundProject.name + "' atualizado para assinado (✅).",
          projectId: foundProject.id,
          projectIndex: foundIndex,
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
