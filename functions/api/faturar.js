// Cloudflare Pages Function - proxy para abrir processo no Holmes
// Evita problema de CORS fazendo a chamada pelo servidor

const HOLMES_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoiNjdkYzJjMzUxNjk2YjgwYjc3ZjJlZTNlIiwiaWF0IjoxNzQyNDgyNDg1fQ.AYduCq4ode2wFUByBEWnWlkus6kBL9UmQA4SDtydjuo';
const HOLMES_FLOW_ID = '69e13d8122a80a2f575004f2';
const FIELD_FORNECEDOR = '930bd0a0-39cd-11f1-b017-3d7c97fba7e7';
const FIELD_ITEM_LOCADO = '8b805b80-39cd-11f1-b017-3d7c97fba7e7';
const FIELD_PROJETO = 'b3840a50-39cd-11f1-b017-3d7c97fba7e7';
const FIELD_LINK_FATURA = 'af382fd0-39cd-11f1-b017-3d7c97fba7e7';

export async function onRequestPost(context) {
  try {
    const payload = await context.request.json();
    const { fornecedor, itemLocado, projeto, linkFatura, titulo } = payload;

    const body = {
      workflow: {
        documents: [],
        property_values: [
          { id: FIELD_FORNECEDOR, value: fornecedor || '' },
          { id: FIELD_ITEM_LOCADO, value: itemLocado || '' },
          { id: FIELD_PROJETO, value: projeto || '' },
          { id: FIELD_LINK_FATURA, value: linkFatura || '' }
        ],
        run_automations: true,
        run_triggers: true,
        start_event: 'StartEvent_1',
        test: false,
        whats: titulo || 'Faturamento'
      }
    };

    const resp = await fetch(
      `https://app-api.holmesdoc.io/v1/workflows/${HOLMES_FLOW_ID}/start?minimal=true`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HOLMES_TOKEN}`
        },
        body: JSON.stringify(body)
      }
    );

    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }

    return new Response(JSON.stringify({
      ok: resp.ok,
      status: resp.status,
      data
    }), {
      status: resp.ok ? 200 : 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      error: err.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function onRequestGet() {
  return new Response(JSON.stringify({
    ok: true,
    message: 'Cloudflare Function ativa. Use POST para faturar.'
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
