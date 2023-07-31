const { hash, compare } = require("bcryptjs");
const sqliteConnection = require("../database/sqlite");

const UserRepository = require("../repositories/UserRepository");
const UserCreateService = require("../services/UserCreateService") 
const AppError = require("../utils/AppError");

class UsersController {
    /*
    - Boas práticas - máximo 5 funções em uma class
    * index - GET para listar vários registros;
    * show - GET para exibir um registro específico;
    * create - POST para criar um registro;
    * update - PUT para atualizar um registro;
    * delete - DELETE para deletar um registro.
    */

    async create(request, response) {
        const { name, email, password } = request.body;

        const userRepository = new UserRepository();
        const userCreateService = new UserCreateService(userRepository);

        await userCreateService.execute({name, email, password});

        return response.status(201).json();
    }

    async update(request, response) {
        const {name, email, password, old_password} = request.body;
        const user_id = request.user.id

        const database = await sqliteConnection();
        const user = await database.get("SELECT * FROM users WHERE id = (?)", [user_id]);

        if (!user) {
            throw new AppError("Usuário não encontrado!");
        }

        const userWithUpdateEmail = await database.get("SELECT * FROM users WHERE email = (?)", [email]);

        if (userWithUpdateEmail && userWithUpdateEmail.id !== user.id){
            throw new AppError("Este email já está em uso!");
        }

        user.name = name ?? user.name; // ?? - se existir valor name no argumento anterior vai ser mantido
        user.email = email ?? user.email;

        if (password && !old_password) {
            throw new AppError("Você precisa informar a senha antiga para definir a nova senha!");
        }

        if (password && old_password) {
            const checkOldPassword = await compare(old_password, user.password);

            if(!checkOldPassword) {
                throw new AppError("A senha antiga não confere!");
            }

            user.password = await hash(password, 8);
        }

        await database.run(`
            UPDATE users SET
            name = ?,
            email = ?,
            password = ?,
            update_at = DATETIME('now')
            WHERE id = ?`,
            [user.name, user.email, user.password, user_id]
        );

        return response.json();

    }

}

module.exports = UsersController