import { RSA } from "https://deno.land/x/god_crypto@v1.4.9/rsa.ts";
import { Base64 } from "https://deno.land/x/bb64/mod.ts";
import * as ejs from "https://deno.land/x/dejs@0.9.3/mod.ts";
import { Octokit as OctokitCore } from "https://cdn.skypack.dev/@octokit/core?dts";
import { createAppAuth } from "https://cdn.skypack.dev/@octokit/auth-app?dts";
import { paginateRest } from "https://cdn.skypack.dev/@octokit/plugin-paginate-rest?dts";
import { restEndpointMethods } from "https://cdn.skypack.dev/@octokit/plugin-rest-endpoint-methods?dts";
import { retry } from "https://cdn.skypack.dev/@octokit/plugin-retry?dts";
import { writeJson, readJson } from "https://deno.land/x/jsonfile/mod.ts";

const allowedAuthors = ["OWNER", "COLLABORATOR"];

const currentTimestamp = new Date().toISOString();
const Octokit = OctokitCore.plugin(restEndpointMethods, paginateRest, retry);

const outputFilePath = new URL("../README.md", import.meta.url);
const templateFilePath = new URL("./template.md", import.meta.url).pathname;
const dataFilePath = new URL("./data.json", import.meta.url).pathname;

const data = (await readJson(dataFilePath)) as Data;

const repoOptions = {
  owner: "mohebifar",
  repo: "made-in-iran",
};

const appId = 116701;
const installationId = 17126944;
const privateKey = Base64.fromBase64String(
  Deno.env.get("GITHUB_APP_PRIVATE_KEY") ?? ""
).toString();

// Hack: This is to get the JWT sign work with Deno
globalThis.crypto = {
  subtle: {
    importKey: () => {},
    sign: RSASign,
  },
};

const octokit = new Octokit({
  authStrategy: createAppAuth,
  auth: {
    appId,
    privateKey,
    installationId,
  },
  request: {
    timeout: 10000,
  },
});

const list = await octokit.rest.issues.listCommentsForRepo({
  ...repoOptions,
  since: data.lastUpdate,
  per_page: 100,
});

list.data.forEach(async (item) => {
  if (
    !allowedAuthors.includes(item.author_association) ||
    !hasCommand(item.body)
  ) {
    return;
  }

  const author = item.user.login;
  const issueNumber = getIssueNumber(item.issue_url);
  const createComment = (body: string) =>
    octokit.rest.issues.createComment({
      ...repoOptions,
      issue_number: issueNumber,
      body,
    });
  const closeIssue = () =>
    octokit.rest.issues.update({
      ...repoOptions,
      issue_number: issueNumber,
      state: "closed",
    });

  const addCommandOptions = evalAddCommand(item.body);

  if (addCommandOptions) {
    const [, owner, repo, category] = addCommandOptions;

    const categoryInData = data.curated.find(
      (candidate) =>
        candidate.category.toLowerCase() === category.toLowerCase() ||
        candidate.anchor?.toLowerCase() === category.toLowerCase()
    );

    if (!categoryInData) {
      createComment(`Unrecognizable category: ${category} /cc @${author}`);

      return;
    }

    const repoPath = `${owner}/${repo}`;
    const link = `https://github.com/${repoPath}`;

    if (categoryInData.repos.includes(repoPath)) {
      await createComment(
        `[${repo} by ${owner}](${link}) is already in the list. Closing as it is a duplicate.`
      );
      await closeIssue();
      return;
    }

    categoryInData.repos.push(repoPath);

    try {
      await createComment(
        `[${repo} by ${owner}](${link}) has been added to our collection. Thank you for your contribution.`
      );
      await closeIssue();
      console.info(`${repoPath} has been added`);
    } catch (error) {
      console.error(error);
    }

    return;
  }

  createComment(`Unrecognizable command: ${item.body} /cc ${author}`);
});

const repositories = data.curated.map((item) => {
  const fetchReposPromise = item.repos.map((repoPath) => {
    const [owner, repo] = repoPath.split("/");
    return octokit.rest.repos.get({ owner, repo });
  });

  return Promise.allSettled(fetchReposPromise).then((rawResult) => {
    const result = rawResult
      .filter((result, index): result is PromiseFulfilledResult<any> => {
        if (result.status !== "fulfilled") {
          console.info(
            "Skipping a repo: ",
            result.reason?.message,
            item.repos[index]
          );

          return false;
        }

        return Boolean(result.value.data);
      })
      .map((response) => response.value.data)
      .sort((a, b) => (a.stargazers_count < b.stargazers_count ? 1 : -1));

    return {
      anchor: item.anchor ?? item.category.toLowerCase(),
      category: item.category,
      repos: result,
    };
  });
});

try {
  const curated = await Promise.all(repositories);
  const markdown = await ejs.renderFile(templateFilePath, { curated });

  await Deno.copy(
    markdown,
    Deno.openSync(outputFilePath, { truncate: true, write: true })
  );

  data.lastUpdate = currentTimestamp;
  await writeJson(dataFilePath, data, { spaces: 2 });
} catch (error) {
  console.error(error);
}

Deno.exit();

function getIssueNumber(issueUrl: string) {
  const match = issueUrl.match(/\d+$/);
  return match && match[0];
}

function hasCommand(body: string) {
  return /^\/\w+/.test(body);
}

function evalAddCommand(body: string) {
  return body.match(
    // /add  OWNER_USERNAME                          / REPO_NAME      CATEGORY
    /^\/add\s([a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38})\/([a-z0-9\-_]+)\s([a-z0-9\-_]+)*$/
  );
}

async function RSASign(
  _alg: string,
  _key: string,
  encodedMessage: ArrayBuffer
) {
  return await new RSA(RSA.parseKey(privateKey)).sign(
    new Uint8Array(encodedMessage),
    {
      algorithm: "rsassa-pkcs1-v1_5",
      hash: "sha256",
    }
  );
}

interface Data {
  curated: {
    category: string;
    anchor: string;
    repos: string[];
  }[];
  lastUpdate: string;
}
