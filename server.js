// server.js
const express = require('express');
const yahooFinance = require('yahoo-finance2').default;
const cors = require('cors');

const app = express();

// Usar el puerto definido por Render o el 5000 por defecto
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/price/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    console.log(`Buscando precio para: ${symbol}`);
    let quote;
    try {
      quote = await yahooFinance.quote(symbol);
    } catch (firstErr) {
      console.log(`Primer intento falló, probando alternativas para: ${symbol}`);
      const alternatives = [
        `${symbol.replace('-USD', '')}`,
        `${symbol.replace('-USD', '')}-USD`,
        `${symbol.replace('-USD', '')}.X`
      ];

      for (const alt of alternatives) {
        if (alt === symbol) continue;
        try {
          console.log(`Intentando con alternativa: ${alt}`);
          quote = await yahooFinance.quote(alt);
          if (quote && quote.regularMarketPrice) break;
        } catch (e) {
          console.log(`Alternativa ${alt} falló`);
        }
      }
    }

    if (!quote || !quote.regularMarketPrice) {
      return res.status(404).json({ error: `No se encontraron datos para ${symbol}` });
    }

    return res.json({ symbol, price: quote.regularMarketPrice });
  } catch (err) {
    console.error('YF‑ERR', err);
    return res.status(500).json({ error: `Falló la consulta a Yahoo Finance para ${symbol}` });
  }
});

app.get('/api/prices', async (req, res) => {
  const symbols = req.query.symbols;

  if (!symbols) {
    return res.status(400).json({ error: 'Se requiere el parámetro "symbols"' });
  }

  const symbolsList = symbols.split(',').map(s => s.trim().toUpperCase());

  try {
    const results = {};
    await Promise.all(
      symbolsList.map(async (symbol) => {
        try {
          const quote = await yahooFinance.quote(symbol);
          if (quote && quote.regularMarketPrice) {
            results[symbol] = {
              price: quote.regularMarketPrice,
              change: quote.regularMarketChangePercent,
              name: quote.shortName || quote.longName || symbol
            };
          }
        } catch (err) {
          console.error(`Error obteniendo datos para ${symbol}:`, err);
        }
      })
    );

    return res.json(results);
  } catch (err) {
    console.error('Error general:', err);
    return res.status(500).json({ error: 'Error consultando Yahoo Finance' });
  }
});

// Endpoint raíz para verificar que el servidor está funcionando
app.get('/', (req, res) => {
  res.send('Servidor funcionando correctamente en Render!');
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
