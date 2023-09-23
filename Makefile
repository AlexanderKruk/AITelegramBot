build: 
	docker build -t aifriend .
run: 
	docker run -d -p 3000:3000 --name aifriend --rm aifriend
stop: 
	docker stop aifriend