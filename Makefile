web-build:
	npm run build

web-docker-build:
	docker build -t primordial-orbs-web:latest .

web-docker-run:
	docker run --rm -p 8080:80 primordial-orbs-web:latest

web-prod: web-docker-build web-docker-run
