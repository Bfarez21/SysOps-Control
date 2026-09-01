FROM node:20-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el código de la aplicación
COPY . .

# Exponer el puerto de la API
EXPOSE 3001

# Comando de inicio
CMD ["node", "index.js"]