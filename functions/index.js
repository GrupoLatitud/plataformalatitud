const { onRequest } = require('firebase-functions/v2/https');

const HOLMES_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoiNjdkYzJjMzUxNjk2YjgwYjc3ZjJlZTNlIiwiaWF0IjoxNzQyNDgyNDg1fQ.AYduCq4ode2wFUByBEWnWlkus6kBL9UmQA4SDtydjuo';
const HOLMES_FLOW_ID = '69e13d8122a80a2f575004f2';
const FIELD_FORNECEDOR = '930bd0a0-39cd-11f1-b017-3d7c97fba7e7';
const FIELD_ITEM_LOCADO = '8b805b80-39cd-11f1-b017-3d7c97fba7e7';
const FIELD_PROJETO = 'b3840a50-39cd-11f1-b017-3d7c97fba7e7';
const FIELD_LINK_FATURA = 'af382fd0-39cd-11f1-b017-3d7c97fba7e7';

exports.faturar = onRequest({ cors: true, region: 'us-central1', invoker: 'public' }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }

  try {
    const { fornecedor, itemLocado, projeto, linkFatura, titulo } = req.body || {};

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

    const holmesResp = await fetch(
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

    const text = await holmesResp.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }

    res.status(holmesResp.ok ? 200 : 502).json({
      ok: holmesResp.ok,
      status: holmesResp.status,
      data
    });
  } catch (err) {
    console.error('Erro no proxy Holmes:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
