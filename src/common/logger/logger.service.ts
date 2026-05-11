import { ConsoleLogger, Injectable, OnModuleDestroy } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LoggerService extends ConsoleLogger implements OnModuleDestroy {
  private fileStream!: fs.WriteStream;
  private readonly logDir =
    process.env.LOG_DIR ?? path.join(process.cwd(), 'logs');
  private currentFileSize = 0;
  private currentDate: string;
  // 10 MB per file before rotation
  private readonly maxFileSize = 1024 * 1024 * 10;

  constructor(readonly context: string = 'App') {
    super(context);
    this.createLogDir();
    this.currentDate = this.getDate();
    this.openStream();
  }

  /* CREATE LOG DIR */
  private createLogDir() {
    if (!fs.existsSync(this.logDir))
      fs.mkdirSync(this.logDir, { recursive: true });
  }

  /* GET DATE */
  private getDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /* OPEN STREAM */
  private openStream() {
    const file = path.join(this.logDir, `${this.currentDate}.log`);
    this.fileStream = fs.createWriteStream(file, { flags: 'a' });
    this.currentFileSize = fs.existsSync(file) ? fs.statSync(file).size : 0;
  }

  /* ROTATE LOGS */
  private rotateLogs() {
    this.fileStream.close();
    this.currentDate = this.getDate();
    this.openStream();
  }

  /* WRITE TO FILE */
  private writeToFile(
    level: string,
    message: unknown,
    context?: string,
    trace?: string,
  ) {
    const d = new Date();
    const ts = `${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR')}`;
    const ctx = context ?? this.context ?? '';
    const line = `[${ts}] [${level}] [${ctx}] ${String(message)}${
      trace ? `\n${trace}` : ''
    }\n`;
    const size = Buffer.byteLength(line, 'utf8');
    if (this.currentFileSize + size > this.maxFileSize) this.rotateLogs();
    this.fileStream.write(line);
    this.currentFileSize += size;
  }

  /* LOG */
  override log(message: unknown, context?: string) {
    super.log(message, context);
    this.writeToFile('LOG', message, context);
  }

  /* ERROR */
  override error(message: unknown, trace?: string, context?: string) {
    super.error(message, trace, context);
    this.writeToFile('ERROR', message, context, trace);
  }

  /* WARN */
  override warn(message: unknown, context?: string) {
    super.warn(message, context);
    this.writeToFile('WARN', message, context);
  }

  /* ON MODULE DESTROY */
  onModuleDestroy() {
    if (this.fileStream && !this.fileStream.destroyed) this.fileStream.end();
  }
}
