
sudo apt install python3.10-venv - модуль для возможности создать окружение  
python3 -m venv env - создания переменного окружения  
source env/bin/activate - вход в окружение  
deactivate - выход из окружения
flask run - запуск проекта

requirements.txt - необходимые пакеты
pip freeze > requirements.txt - Сохранить текущие пакеты
pip install -r ./requirements.txt - Установить пакеты  

Так я тут подзаебся по этому важные команды  
pip install -r ./requirements.txt - Установить пакеты   
flask run - запуск проекта  
По идее должно стартануть  
в .flaskenv основные константы. Вот с подключенее в бд я не допер как в .flaskenv вынести

uploads - папка для временного хранения файлов. 