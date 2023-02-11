import { BigNumber, providers } from "ethers";
import { addresses } from "../../constants";
import {
  formatUnits,
  getContract,
  getIsValidAddress,
  getRetirementTokenByAddress,
  getTokenDecimals,
} from "../../utils";
import { getStaticProvider } from "../getStaticProvider";

import {
  RetirementIndexInfo,
  RetirementIndexInfoResult,
  RetirementsTotalsAndBalances,
} from "../../types/offset";

export const createRetirementStorageContract = (
  provider: providers.JsonRpcProvider
) => getContract({ contractName: "retirementStorage", provider });

export const createRetirementAggregatorV2Contract = (
  provider: providers.JsonRpcProvider
) => getContract({ contractName: "retirementAggregatorV2", provider });

export const getRetirementIndexInfo = async (params: {
  beneficiaryAddress: string;
  index: number;
  infuraId?: string;
}): Promise<RetirementIndexInfoResult> => {
  try {
    const provider = getStaticProvider({
      infuraId: params.infuraId,
    });
    const retirementAggregatorV2 =
      createRetirementAggregatorV2Contract(provider);

    const [
      tokenAddress,
      amount,
      beneficiaryName,
      retirementMessage,
    ]: RetirementIndexInfo = await retirementAggregatorV2.getRetirementDetails(
      params.beneficiaryAddress,
      BigNumber.from(params.index)
    );

    if (!getIsValidAddress(tokenAddress))
      throw new Error(`Invalid tokenAddress: ${tokenAddress}`);

    const typeOfToken = getRetirementTokenByAddress(tokenAddress);

    if (!typeOfToken) throw new Error(`Unknown tokenAddress: ${tokenAddress}`);

    // if not a known token assume 18 e.g. TC02
    const tokenDecimals = getTokenDecimals(typeOfToken);
    const formattedAmount = formatUnits(amount, tokenDecimals);

    return {
      tokenAddress,
      typeOfToken,
      amount: formattedAmount,
      beneficiaryName,
      retirementMessage,
    };
  } catch (e) {
    console.error("getRetirementIndexInfo Error", e);
    return Promise.reject(e);
  }
};

export const getRetirementTotalsAndBalances = async (params: {
  address: string;
  infuraId?: string;
}): Promise<RetirementsTotalsAndBalances> => {
  try {
    const provider = getStaticProvider({
      infuraId: params.infuraId,
    });
    const retirementAggregatorV2 =
      createRetirementAggregatorV2Contract(provider);

    const promises: [
      BigNumber,
      BigNumber,
      BigNumber,
      BigNumber,
      BigNumber,
      BigNumber,
      BigNumber,
      BigNumber
    ] = [
      retirementAggregatorV2.getTotalRetirements(params.address),
      retirementAggregatorV2.getTotalCarbonRetired(params.address),
      retirementAggregatorV2.getTotalRewardsClaimed(params.address),
      retirementAggregatorV2.getTotalPoolRetired(
        params.address,
        addresses["mainnet"].bct
      ),
      retirementAggregatorV2.getTotalPoolRetired(
        params.address,
        addresses["mainnet"].mco2
      ),
      retirementAggregatorV2.getTotalPoolRetired(
        params.address,
        addresses["mainnet"].nct
      ),
      retirementAggregatorV2.getTotalPoolRetired(
        params.address,
        addresses["mainnet"].ubo
      ),
      retirementAggregatorV2.getTotalPoolRetired(
        params.address,
        addresses["mainnet"].nbo
      ),
    ];
    const [
      totalRetirements,
      totalTonnesRetired,
      totalTonnesClaimedForNFTS,
      bct,
      mco2,
      nct,
      ubo,
      nbo,
    ] = await Promise.all(promises);

    return {
      totalRetirements: totalRetirements.toString(),
      totalTonnesRetired: formatUnits(totalTonnesRetired, 18),
      totalTonnesClaimedForNFTS: formatUnits(totalTonnesClaimedForNFTS, 18),
      bct: formatUnits(bct, 18),
      mco2: formatUnits(mco2, 18),
      nct: formatUnits(nct, 18),
      ubo: formatUnits(ubo, 18),
      nbo: formatUnits(nbo, 18),
    };
  } catch (error) {
    console.error(error);
    return Promise.reject(error);
  }
};
