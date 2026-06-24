export const DEFAULT_COMMON_DEV_PORTS = [
  3000, 3001, 3002, 3005, 3333, 4000, 4173, 4200, 4321, 5000, 5173, 6006, 7000, 8000, 8008, 8080,
  8081, 8888, 9000,
];

export const DEFAULT_PROTECTED_PORTS = [
  20, 21, 22, 25, 53, 80, 110, 143, 389, 443, 445, 465, 587, 636, 993, 995, 1433, 1521, 2049, 2375,
  2376, 27017, 3306, 50070, 5432, 5601, 5672, 5900, 5984, 6379, 6443, 8001, 8086, 9200, 9300, 11211,
  15672,
];

export const PROTECTED_PORT_LABELS = new Map<number, string>([
  [22, "SSH"],
  [25, "SMTP"],
  [53, "DNS"],
  [80, "HTTP system service"],
  [443, "HTTPS system service"],
  [1433, "SQL Server"],
  [1521, "Oracle"],
  [2375, "Docker"],
  [2376, "Docker"],
  [27017, "MongoDB"],
  [3306, "MySQL"],
  [5432, "Postgres"],
  [5672, "RabbitMQ"],
  [6379, "Redis"],
  [6443, "Kubernetes"],
  [9200, "Elasticsearch"],
  [11211, "Memcached"],
]);
