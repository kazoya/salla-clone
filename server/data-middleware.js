// Express middleware: wait for the data layer, reload from Postgres on every request (instances stay in sync),
// and make sure pending writes are committed before the response is sent (serverless functions freeze after it).
module.exports = function dataMiddleware({ ready, refresh, flush }) {
  return async (req, res, next) => {
    try {
      await ready;
      await refresh();
    } catch (e) {
      console.error('data layer error', e);
      return res.status(503).json({ error: 'قاعدة البيانات غير متاحة حالياً' });
    }
    const send = res.send.bind(res);
    let sending = false;
    res.send = (body) => {
      if (sending) return send(body);
      sending = true;
      Promise.resolve(flush()).then(() => send(body), (e) => {
        console.error('save failed', e);
        res.status(500); send(JSON.stringify({ error: 'تعذر حفظ البيانات' }));
      });
      return res;
    };
    next();
  };
};
