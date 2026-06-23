// /api/send-whatsapp.js

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, whatsapp, seat, ticketCode, imageUrl } = req.body;

  if (!name || !whatsapp || !seat || !ticketCode || !imageUrl) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  // Clean phone number (keep digits only)
  const cleanPhone = whatsapp.replace(/\D/g, "");
  // Ensure DDD is correct and prefix is 55 (Brazil)
  const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  // Read environment variables
  const provider = process.env.WHATSAPP_PROVIDER || 'webhook'; // options: webhook, z-api, evolution
  const apiUrl = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_API_TOKEN; // client-token for z-api, apikey for evolution
  const instance = process.env.WHATSAPP_INSTANCE; // instance-token for z-api, instance name for evolution

  const messageText = `Olá *${name}*! Confirmamos sua vaga no treinamento *O Profissional do Futuro: IA & Aplicações*! 🎟️\n\n*DETALHES DO SEU INGRESSO*\n👤 Nome: ${name}\n🪑 Assento: ${seat}\n🔑 Código: ${ticketCode}\n📍 Local: Porto Digital - Recife Antigo (EPEC)\n📅 Horário: Sábado, às 14:00h\n\nO seu ingresso oficial está anexo nesta mensagem. Apresente-o na entrada do evento! 🚀`;

  try {
    if (provider === 'webhook') {
      const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
      if (!webhookUrl) {
        throw new Error('WHATSAPP_WEBHOOK_URL environment variable is not defined');
      }

      // Send a generic POST request to the webhook URL
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          whatsapp: formattedPhone,
          seat,
          ticketCode,
          imageUrl,
          message: messageText
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Webhook responded with status ${response.status}: ${text}`);
      }

      return res.status(200).json({ success: true, provider: 'webhook' });
    }

    if (provider === 'z-api') {
      if (!apiUrl || !token || !instance) {
        throw new Error('Z-API credentials missing (WHATSAPP_API_URL, WHATSAPP_API_TOKEN, WHATSAPP_INSTANCE)');
      }

      // Format URL for Z-API
      const sendUrl = `${apiUrl}/instances/${instance}/token/${token}/send-image`;

      const response = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': token
        },
        body: JSON.stringify({
          phone: formattedPhone,
          image: imageUrl,
          caption: messageText
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(`Z-API responded with error: ${JSON.stringify(result)}`);
      }

      return res.status(200).json({ success: true, provider: 'z-api', result });
    }

    if (provider === 'evolution') {
      if (!apiUrl || !token || !instance) {
        throw new Error('Evolution API credentials missing (WHATSAPP_API_URL, WHATSAPP_API_TOKEN, WHATSAPP_INSTANCE)');
      }

      // Evolution API: POST {apiUrl}/message/sendMedia/{instance}
      const sendUrl = `${apiUrl}/message/sendMedia/${instance}`;

      const response = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': token
        },
        body: JSON.stringify({
          number: formattedPhone,
          mediaMessage: {
            mediatype: 'image',
            fileName: `ingresso-epec-${seat}.png`,
            caption: messageText,
            media: imageUrl
          }
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(`Evolution API responded with error: ${JSON.stringify(result)}`);
      }

      return res.status(200).json({ success: true, provider: 'evolution', result });
    }

    return res.status(400).json({ error: `Unsupported provider: ${provider}` });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
