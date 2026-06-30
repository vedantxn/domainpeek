export interface Vulnerability {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  url: string;
  parameter?: string;
  payload?: string;
  description: string;
  evidence?: string;
  remediation: string;
  cwe?: string;
  owasp?: string;
}

export interface ScanResult {
  url: string;
  timestamp: string;
  duration: number;
  vulnerabilities: Vulnerability[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  };
}

export interface ScanOptions {
  url: string;
  timeout?: number;
  userAgent?: string;
  followRedirects?: boolean;
  maxDepth?: number;
  checks?: string[];
}

export interface FormInfo {
  action: string;
  method: string;
  inputs: FormInput[];
  url: string;
}

export interface FormInput {
  name: string;
  type: string;
  value: string;
}

export interface LinkInfo {
  url: string;
  text: string;
  params: Record<string, string>;
}
