class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'Endpoint tidak ditemukan.'
    }
  });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Terjadi kesalahan internal pada server.';

  if (err instanceof HttpError) {
    status = err.status;
    code = err.code;
    message = err.message;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_JSON';
    message = 'Format JSON tidak valid.';
  } else if (err.status === 413) {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Ukuran body permintaan melebihi batas 10kb.';
  }

  if (status === 500) {
    console.error('[SERVER_ERROR]', err.name);
  }

  res.status(status).json({
    success: false,
    error: { code, message }
  });
}

module.exports = { HttpError, notFoundHandler, errorHandler };