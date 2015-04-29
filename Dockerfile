FROM cmfatih/phantomjs
COPY app /app
EXPOSE 80
ENTRYPOINT phantomjs /app/phantomjs-runner.js
