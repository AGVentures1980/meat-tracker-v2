"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var imap_simple_1 = __importDefault(require("imap-simple"));
var mailparser_1 = require("mailparser");
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var ReportParserService_1 = require("../services/ReportParserService");
// --- CONFIGURATION ---
var CONFIG = {
    user: 'alexandregarcia@texasdebrazil.com',
    password: process.env.OFFICE365_APP_PASSWORD || '', // WE NEED THIS
    host: 'outlook.office365.com',
    port: 993,
    tls: true,
    authTimeout: 10000
};
var DOWNLOAD_DIR = path_1.default.join(__dirname, '../../data_ingestion/redbook_test');
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var connection, searchCriteria, fetchOptions, messages, found, _i, messages_1, item, all, id, idHeader, mail, isRedbook, isNetSales, senderAddress, _a, _b, attachment, filePath, data, data, err_1, err_2;
        var _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (!CONFIG.password) {
                        console.error("❌ ERROR: Missing Password. Please set OFFICE365_APP_PASSWORD environment variable or edit the script temporarily.");
                        return [2 /*return*/];
                    }
                    console.log("\uD83D\uDD35 Connecting to ".concat(CONFIG.host, " as ").concat(CONFIG.user, "..."));
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 19, , 20]);
                    return [4 /*yield*/, imap_simple_1.default.connect({ imap: CONFIG })];
                case 2:
                    connection = _e.sent();
                    console.log("✅ Connected!");
                    return [4 /*yield*/, connection.openBox('INBOX')];
                case 3:
                    _e.sent();
                    console.log("📂 Inbox opened. Searching for recent 'Red Book' emails...");
                    searchCriteria = [
                        'ALL',
                        ['SINCE', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()] // Last 48 hours
                    ];
                    fetchOptions = {
                        bodies: ['HEADER', 'TEXT', ''],
                        struct: true,
                        markSeen: false
                    };
                    return [4 /*yield*/, connection.search(searchCriteria, fetchOptions)];
                case 4:
                    messages = _e.sent();
                    console.log("\uD83D\uDD0E Found ".concat(messages.length, " messages in the last 48h."));
                    found = false;
                    _i = 0, messages_1 = messages;
                    _e.label = 5;
                case 5:
                    if (!(_i < messages_1.length)) return [3 /*break*/, 18];
                    item = messages_1[_i];
                    all = item.parts.find(function (part) { return part.which === ''; });
                    if (!all) {
                        console.log("\u26A0\uFE0F Skipping message ".concat(item.attributes.uid, " (no body part)"));
                        return [3 /*break*/, 17];
                    }
                    id = item.attributes.uid;
                    idHeader = "Imap-Id: " + id + "\r\n";
                    return [4 /*yield*/, (0, mailparser_1.simpleParser)(idHeader + all.body)];
                case 6:
                    mail = _e.sent();
                    console.log("   - Subject: ".concat(mail.subject));
                    isRedbook = mail.subject && (mail.subject.toUpperCase().includes('RED BOOK') || mail.subject.toUpperCase().includes('REDBOOK'));
                    isNetSales = mail.subject && mail.subject.toUpperCase().includes('NET SALES');
                    if (!(isRedbook || isNetSales)) return [3 /*break*/, 17];
                    console.log("   \uD83C\uDFAF MATCH FOUND! Subject: ".concat(mail.subject));
                    senderAddress = ((_d = (_c = mail.from) === null || _c === void 0 ? void 0 : _c.value[0]) === null || _d === void 0 ? void 0 : _d.address) || 'unknown';
                    console.log("   \uD83D\uDC64 Sender: ".concat(senderAddress));
                    if (!(mail.attachments && mail.attachments.length > 0)) return [3 /*break*/, 16];
                    _a = 0, _b = mail.attachments;
                    _e.label = 7;
                case 7:
                    if (!(_a < _b.length)) return [3 /*break*/, 15];
                    attachment = _b[_a];
                    if (!(attachment.filename && attachment.filename.toUpperCase().includes('.PDF'))) return [3 /*break*/, 14];
                    console.log("      \uD83D\uDCCE Found PDF Attachment: ".concat(attachment.filename));
                    // Download
                    if (!fs_1.default.existsSync(DOWNLOAD_DIR)) {
                        fs_1.default.mkdirSync(DOWNLOAD_DIR, { recursive: true });
                    }
                    filePath = path_1.default.join(DOWNLOAD_DIR, "".concat(Date.now(), "_").concat(attachment.filename));
                    fs_1.default.writeFileSync(filePath, attachment.content);
                    console.log("      \u2705 Saved to: ".concat(filePath));
                    found = true;
                    _e.label = 8;
                case 8:
                    _e.trys.push([8, 13, , 14]);
                    if (!isRedbook) return [3 /*break*/, 10];
                    return [4 /*yield*/, ReportParserService_1.ReportParserService.parseRedbook(attachment.content)];
                case 9:
                    data = _e.sent();
                    console.log("      \uD83D\uDCCA [PARSER] Redbook Extracted -> Lunch Guests: ".concat(data.lunchGuests, ", Dinner Guests: ").concat(data.dinnerGuests));
                    return [3 /*break*/, 12];
                case 10:
                    if (!isNetSales) return [3 /*break*/, 12];
                    return [4 /*yield*/, ReportParserService_1.ReportParserService.parseNetSales(attachment.content)];
                case 11:
                    data = _e.sent();
                    console.log("      \uD83D\uDCB5 [PARSER] Net Sales Extracted -> ".concat(data));
                    _e.label = 12;
                case 12: return [3 /*break*/, 14];
                case 13:
                    err_1 = _e.sent();
                    console.error("      \u274C [PARSER] Error parsing PDF ".concat(attachment.filename), err_1);
                    return [3 /*break*/, 14];
                case 14:
                    _a++;
                    return [3 /*break*/, 7];
                case 15: return [3 /*break*/, 17];
                case 16:
                    console.log("      ⚠️ No attachments found.");
                    _e.label = 17;
                case 17:
                    _i++;
                    return [3 /*break*/, 5];
                case 18:
                    if (!found) {
                        console.log("❌ No Red Book PDF found in recent emails.");
                    }
                    connection.end();
                    return [3 /*break*/, 20];
                case 19:
                    err_2 = _e.sent();
                    console.error("❌ Connection Error:", err_2);
                    return [3 /*break*/, 20];
                case 20: return [2 /*return*/];
            }
        });
    });
}
main();
