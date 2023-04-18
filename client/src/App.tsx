import { WalletSelector } from '@aptos-labs/wallet-adapter-ant-design'
import { Button, Layout, Row, Col, List, Checkbox, Input, Space } from 'antd'
import { useWallet } from '@aptos-labs/wallet-adapter-react'

import '@aptos-labs/wallet-adapter-ant-design/dist/index.css'
import { useEffect, useState } from 'react'
import { getContractAccount } from './id'
import { formatAddress, getAptosClient } from './aptos'
import { Task } from './todo-list'
import { CheckboxChangeEvent } from 'antd/es/checkbox/Checkbox'

import './App.css'

export default function App() {
  const { account, signAndSubmitTransaction } = useWallet()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [isTransactionInProgress, setTransactionInProgress] = useState(false)
  const [newTask, setNewTask] = useState('')
  const aptosClient = getAptosClient()

  const fetchList = async () => {
    if (!account) {
      return []
    }

    // change this to be your module account address
    try {
      const todoListResource = await aptosClient.getAccountResource(
        account.address,
        `${getContractAccount()}::todolist::TodoList`
      )
      const tableHandle = (todoListResource as any).data?.tasks?.handle
      const tasksCounter = parseInt((todoListResource as any).data?.counter, 10)
      if (isNaN(tasksCounter)) {
        console.debug(
          'task counter:',
          tasksCounter,
          'response data:',
          todoListResource.data
        )
        throw new Error('failed to fetch todolist tasks counter')
      }

      const onChainTasks = await Promise.all(
        new Array(tasksCounter).fill(null).map(async (_item, idx) => {
          return aptosClient.getTableItem(tableHandle, {
            key_type: 'u64',
            value_type: `${getContractAccount()}::todolist::Task`,
            key: (idx + 1).toString(),
          })
        }, [])
      )

      setTasks(onChainTasks)
    } catch (err) {
      setTasks(null)
      throw err
    }
  }

  useEffect(() => {
    fetchList()
  }, [account?.address])

  const addNewList = async () => {
    if (!account) {
      return
    }

    const payload = {
      type: 'entry_function_payload',
      function: `${getContractAccount()}::todolist::create_list`,
      type_arguments: [],
      arguments: [],
    }

    try {
      setTransactionInProgress(true)
      const response = await signAndSubmitTransaction(payload)
      await aptosClient.waitForTransaction(response.hash)
      setTasks([])
    } catch (err) {
      setTasks(null)
      throw err
    } finally {
      setTransactionInProgress(false)
    }
  }

  const onWriteTask = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setNewTask(value)
  }

  const onTaskAdded = async () => {
    if (!account) {
      // wallet not connected
      return
    }

    if (tasks === null) {
      // no todo list
      return
    }

    setTransactionInProgress(true)
    let latestId = 1
    if (tasks.length > 0) {
      latestId = parseInt(tasks[tasks.length - 1].task_id + 1)
    }

    try {
      const res = await signAndSubmitTransaction({
        type: 'entry_function_payload',
        function: `${getContractAccount()}::todolist::create_task`,
        type_arguments: [],
        arguments: [newTask],
      })

      await aptosClient.waitForTransaction(res.hash)

      setTasks([
        ...tasks,
        {
          address: account.address,
          completed: false,
          content: newTask,
          task_id: latestId.toString(),
        },
      ])
      setNewTask('')
    } catch (err) {
      // TODO: add error state
      throw err
    } finally {
      setTransactionInProgress(false)
    }
  }

  const onCheckboxChange = async (
    event: CheckboxChangeEvent,
    taskId: string
  ) => {
    if (!account) {
      // wallet not connected
      return
    }

    if (tasks === null) {
      // no todo list
      return
    }

    if (!event.target.checked) {
      return
    }

    setTransactionInProgress(true)
    const payload = {
      type: 'entry_function_payload',
      function: `${getContractAccount()}::todolist::complete_task`,
      type_arguments: [],
      arguments: [taskId],
    }

    try {
      const response = await signAndSubmitTransaction(payload)
      await aptosClient.waitForTransaction(response.hash)

      setTasks((prevState) => {
        if (prevState === null) {
          return null
        }

        const newState = prevState.map((obj) => {
          // if task_id equals the checked taskId, update completed property
          if (obj.task_id === taskId) {
            return { ...obj, completed: true }
          }

          // otherwise return object as is
          return obj
        })

        return newState
      })
    } catch (err) {
      // TODO: add error state
      throw err
    } finally {
      setTransactionInProgress(false)
    }
  }

  return (
    <Layout>
      <Layout.Header>
        <Row justify="space-between">
          <Col>
            <h1 className="logo">Aptos Example Todo List</h1>
          </Col>
          <Col>
            <span className="tld-wallet-address">
              wallet{' '}
              {account ? formatAddress(account.address) : 'not connected'}
            </span>
          </Col>
        </Row>
      </Layout.Header>
      <Layout.Content className="tld-content-container">
        {!account && (
          <Row gutter={[0, 32]} justify="center">
            <Col>
              <WalletSelector />
            </Col>
          </Row>
        )}
        {account && tasks === null && (
          <Row gutter={[0, 32]}>
            <Col span={12} offset={6}>
              <Button
                onClick={addNewList}
                loading={isTransactionInProgress}
                block
                type="primary"
              >
                Create a Todo List
              </Button>
            </Col>
          </Row>
        )}
        {account && tasks !== null && (
          <Row gutter={[0, 32]}>
            <Col span={12} offset={6}>
              <Space.Compact block>
                <Input
                  onChange={onWriteTask}
                  value={newTask}
                  placeholder="Add a Task"
                  size="large"
                />
                <Button onClick={onTaskAdded} type="primary">
                  Add
                </Button>
              </Space.Compact>
            </Col>
            <Col span={12} offset={6}>
              {tasks && (
                <List
                  size="small"
                  bordered
                  dataSource={tasks}
                  renderItem={(task: any) => (
                    <List.Item
                      actions={[
                        <div>
                          {task.completed ? (
                            <Checkbox defaultChecked={true} disabled />
                          ) : (
                            <Checkbox
                              onChange={(event) =>
                                onCheckboxChange(event, task.task_id)
                              }
                            />
                          )}
                        </div>,
                      ]}
                    >
                      <List.Item.Meta
                        title={task.content}
                        description={
                          <a
                            href={`https://explorer.aptoslabs.com/account/${task.address}/`}
                            target="_blank"
                          >
                            {formatAddress(task.address)}
                          </a>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Col>
          </Row>
        )}
      </Layout.Content>
    </Layout>
  )
}
