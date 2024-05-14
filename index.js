import { program } from "commander";
import { runTest } from "./runTest";

program.command('run').action(runTest);