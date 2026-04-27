FROM nginx:1.27-alpine
RUN apk add --no-cache gettext
COPY nginx.aws.conf /etc/nginx/nginx.conf.template
EXPOSE 8080
CMD ["/bin/sh", "-c", "envsubst '${INTERNAL_ALB_DNS}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && exec nginx -g 'daemon off;'"]
