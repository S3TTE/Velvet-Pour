.PHONY: build_front deploy_front restart_apache

test_front:
	cd frontend && npm install && npm run

build_front:
	cd frontend && npm install && npx expo export:web

deploy_front:
	sudo cp -r frontend/web-build/* /var/www/html/front/

restart_apache:
	sudo systemctl restart apache2