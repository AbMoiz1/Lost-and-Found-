FROM python:3.12-slim AS build
WORKDIR /app
RUN pip install --upgrade pip
COPY notification/requirements.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app
COPY --from=build /install /usr/local
COPY shared/message_broker.py ./shared/message_broker.py
COPY notification .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
