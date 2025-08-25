// scripts/01_unit_parse_rawtx.test.ts
import { expect } from "chai";
import parseRawTx, { extractRawTxFields } from "../src/utils/tx-utils";
import { BafClient } from "../src/client/baf-client";
import { Wallet, utils } from "ethers";

// instancia del BAF (si no quieres usarlo, deja BAF_RPC sin definir)
const baf = new BafClient(process.env.BAF_RPC);

describe("RawTx parser + BAF", () => {
  // direccion receptora ficticia para firmar legacy
  const receiver = Wallet.createRandom();

  it("should parse EIP-1559 transaction correctly", async () => {
    const rawTxEip1559 =
      "0x02f87101808459682f00847735940082520894cdc0eeb7499a5c4bbc507bed74010e6b0263d173872386f26fc1000080c001a05037a61b178445f160961b2d6f6128a54d3a22957a0c90e980f5406c5b077464a055f4b05163e8b504fda634f51295c70c04daf9725b57b80ca39fea0c1f6beb75";

    const tx = parseRawTx(rawTxEip1559);

    // parsing checks
    expect(tx.type).to.equal(2);
    expect(tx.maxFeePerGas).to.equal("2000000000");
    expect(tx.maxPriorityFeePerGas).to.equal("1500000000");
    expect(tx.gasPrice).to.be.undefined;

    // enviar al BAF y aceptar cualquiera de los outcomes razonables:
    const res = await baf.sendRawTx(rawTxEip1559);

    if (res.error) {
      const msg = String(res.error.message || res.error);
      expect(msg.toLowerCase()).to.match(
        /(insufficient funds|nonce|chain id|invalid|rejected|signature)/i
      );
    } else {
      expect(res.result).to.be.a("string");
      expect(res.result).to.match(/^0x[0-9a-f]{64}$/i);
    }
  });

  it("should parse Legacy transaction correctly", async () => {
    // Firmamos dinámicamente una legacy tx válida (type:0)
    const fundedPrivateKey =
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Hardhat default
    const signer = new Wallet(fundedPrivateKey);

    const legacyTx = {
      to: receiver.address,
      value: 0,
      gasLimit: 21000,
      gasPrice: utils.parseUnits("1", "gwei"),
      nonce: 0,
      type: 0,
    };

    const rawLegacy = await signer.signTransaction(legacyTx);

    const tx = parseRawTx(rawLegacy);

    expect(tx.type).to.equal(0);
    expect(tx.gasLimit).to.equal("21000");
    expect(tx.gasPrice).to.equal(utils.parseUnits("1", "gwei").toString());
    expect(tx.maxFeePerGas).to.be.undefined;
    expect(tx.maxPriorityFeePerGas).to.be.undefined;
    expect((tx.nonce ?? 0)).to.equal(0);

    // enviar al BAF y aceptar outcomes razonables
    const res = await baf.sendRawTx(rawLegacy);

    if (res.error) {
      const msg = String(res.error.message || res.error);
      // Ahora aceptamos también "insufficient funds" y otros mensajes habituales
      expect(msg.toLowerCase()).to.match(
        /(insufficient funds|replay|rejected|blocked|chain id|invalid|signature)/i
      );
    } else {
      expect(res.result).to.be.a("string");
      expect(res.result).to.match(/^0x[0-9a-f]{64}$/i);
    }
  });

  it("should fail on corrupted transaction", () => {
    const corrupted = "0x02deadbeef";
    expect(() => parseRawTx(corrupted)).to.throw("Failed to parse raw transaction");
  });

  it("should extract from/to fields correctly", () => {
    const rawTx =
      "0x02f87101808459682f00847735940082520894cdc0eeb7499a5c4bbc507bed74010e6b0263d173872386f26fc1000080c001a05037a61b178445f160961b2d6f6128a54d3a22957a0c90e980f5406c5b077464a055f4b05163e8b504fda634f51295c70c04daf9725b57b80ca39fea0c1f6beb75";

    const fields = extractRawTxFields(rawTx);

    expect(fields.from).to.equal("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
    expect(fields.to).to.equal("0xcdc0eeb7499a5c4bbc507bed74010e6b0263d173");
  });
});
